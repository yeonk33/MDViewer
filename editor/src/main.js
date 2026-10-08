// MDViewer editor bundle: CodeMirror 6 + Obsidian-style live preview for Markdown.
// The document text is always the source of truth; decorations only change how it is displayed.
// .json files get a plain JSON mode instead (no live preview, no read mode, Shift+Alt+F to pretty print).

import { EditorState, EditorSelection, RangeSetBuilder, Compartment } from "@codemirror/state";
import {
  EditorView, keymap, Decoration, ViewPlugin, WidgetType,
  drawSelection, highlightActiveLine, dropCursor, rectangularSelection, crosshairCursor,
} from "@codemirror/view";
import { history, defaultKeymap, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { syntaxTree, syntaxHighlighting, indentUnit, codeFolding, foldGutter, foldKeymap } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { json } from "@codemirror/lang-json";
import { classHighlighter } from "@lezer/highlight";

// ---------- host bridge ----------
const host = {
  post(msg) { try { window.chrome?.webview?.postMessage(msg); } catch { /* not hosted */ } },
};

// ---------- widgets ----------
class BulletWidget extends WidgetType {
  eq() { return true; }
  toDOM() { const s = document.createElement("span"); s.className = "lp-bullet"; s.textContent = "•"; return s; }
  ignoreEvent() { return false; }
}
class CheckboxWidget extends WidgetType {
  constructor(checked) { super(); this.checked = checked; }
  eq(o) { return o.checked === this.checked; }
  toDOM() {
    const i = document.createElement("input");
    i.type = "checkbox"; i.checked = this.checked; i.className = "lp-checkbox"; i.tabIndex = -1;
    return i;
  }
  ignoreEvent() { return false; }
}
class HRWidget extends WidgetType {
  eq() { return true; }
  toDOM() { const d = document.createElement("div"); d.className = "lp-hr"; return d; }
}
class ImageWidget extends WidgetType {
  constructor(src, alt) { super(); this.src = src; this.alt = alt; }
  eq(o) { return o.src === this.src && o.alt === this.alt; }
  toDOM() {
    const img = document.createElement("img");
    img.src = this.src; img.alt = this.alt; img.className = "lp-image"; img.title = this.alt;
    return img;
  }
}
class LinkIconWidget extends WidgetType {
  eq() { return true; }
  toDOM() { const s = document.createElement("span"); s.className = "lp-linkicon"; s.textContent = "↗"; return s; }
}

const HIDE = Decoration.replace({});
const bullet = Decoration.replace({ widget: new BulletWidget() });
const hr = Decoration.replace({ widget: new HRWidget(), block: false });
const linkIcon = Decoration.widget({ widget: new LinkIconWidget(), side: 1 });

const marks = {
  strong: Decoration.mark({ class: "lp-strong" }),
  em: Decoration.mark({ class: "lp-em" }),
  strike: Decoration.mark({ class: "lp-strike" }),
  code: Decoration.mark({ class: "lp-code" }),
  link: Decoration.mark({ class: "lp-link" }),
  dim: Decoration.mark({ class: "lp-syntax" }),
  url: Decoration.mark({ class: "lp-url" }),
};
const lines = {
  h: [1, 2, 3, 4, 5, 6].map(n => Decoration.line({ class: `lp-h lp-h${n}` })),
  quote: Decoration.line({ class: "lp-quote" }),
  fence: Decoration.line({ class: "lp-fence" }),
  fenceEdge: Decoration.line({ class: "lp-fence lp-fence-edge" }),
  table: Decoration.line({ class: "lp-table" }),
  hr: Decoration.line({ class: "lp-hrline" }),
};

// ---------- live preview plugin ----------
function selectionTouches(state, from, to) {
  for (const r of state.selection.ranges) if (r.from <= to && r.to >= from) return true;
  return false;
}
function lineRange(doc, from, to) {
  return { from: doc.lineAt(from).from, to: doc.lineAt(to).to };
}

function buildDecorations(view) {
  const { state } = view;
  const doc = state.doc;
  const out = []; // {from,to,deco}
  const add = (from, to, deco) => { if (from <= to) out.push({ from, to, deco }); };
  const tree = syntaxTree(state);

  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from, to,
      enter: (n) => {
        const name = n.name;
        const nf = n.from, nt = n.to;

        // --- Headings ---
        if (name.startsWith("ATXHeading")) {
          const level = +name.slice(-1);
          const ln = doc.lineAt(nf);
          add(ln.from, ln.from, lines.h[level - 1]);
          const active = selectionTouches(state, ln.from, ln.to);
          const mark = n.node.getChild("HeaderMark");
          if (mark) {
            let end = mark.to;
            if (doc.sliceString(end, end + 1) === " ") end++;
            add(mark.from, end, active ? marks.dim : HIDE);
          }
          return; // children (inline) still handled below? No — iterate continues into children automatically
        }
        if (name === "SetextHeading1" || name === "SetextHeading2") {
          const level = name === "SetextHeading1" ? 1 : 2;
          const first = doc.lineAt(nf);
          add(first.from, first.from, lines.h[level - 1]);
          const mark = n.node.getChild("HeaderMark");
          if (mark) add(mark.from, mark.to, marks.dim);
          return;
        }

        // --- Inline formatting ---
        if (name === "StrongEmphasis" || name === "Emphasis" || name === "Strikethrough" || name === "InlineCode") {
          const cls = name === "StrongEmphasis" ? marks.strong : name === "Emphasis" ? marks.em
                    : name === "Strikethrough" ? marks.strike : marks.code;
          add(nf, nt, cls);
          const active = selectionTouches(state, nf, nt);
          for (let c = n.node.firstChild; c; c = c.nextSibling) {
            if (c.name === "EmphasisMark" || c.name === "StrikethroughMark" || c.name === "CodeMark")
              add(c.from, c.to, active ? marks.dim : HIDE);
          }
          return name === "InlineCode" ? false : undefined;
        }
        if (name === "Escape") {
          const active = selectionTouches(state, nf, nt);
          add(nf, nf + 1, active ? marks.dim : HIDE);
          return false;
        }

        // --- Images: replace the whole thing with the picture when not being edited ---
        if (name === "Image") {
          const active = selectionTouches(state, nf, nt);
          if (!active) {
            const urlNode = n.node.getChild("URL");
            const src = urlNode ? doc.sliceString(urlNode.from, urlNode.to) : "";
            const text = doc.sliceString(nf, nt);
            const alt = (text.match(/^!\[([^\]]*)\]/) || [, ""])[1];
            if (src) { add(nf, nt, Decoration.replace({ widget: new ImageWidget(src, alt) })); return false; }
          }
          add(nf, nt, marks.dim);
          return false;
        }

        // --- Links: [text](url) → text with the brackets/url hidden ---
        if (name === "Link") {
          const active = selectionTouches(state, nf, nt);
          const urlNode = n.node.getChild("URL");
          const href = urlNode ? doc.sliceString(urlNode.from, urlNode.to) : "";
          add(nf, nt, Decoration.mark({ class: "lp-link", attributes: { "data-href": href, title: href } }));
          if (active) {
            for (let c = n.node.firstChild; c; c = c.nextSibling)
              if (c.name === "LinkMark" || c.name === "URL" || c.name === "LinkTitle") add(c.from, c.to, marks.dim);
          } else {
            // hide leading "[" and everything from "](" to the end
            const kids = [];
            for (let c = n.node.firstChild; c; c = c.nextSibling) kids.push(c);
            const markNodes = kids.filter(k => k.name === "LinkMark");
            if (markNodes.length >= 2) {
              add(markNodes[0].from, markNodes[0].to, HIDE);
              add(markNodes[1].from, nt, HIDE);
            }
          }
          return false;
        }
        if (name === "Autolink") {
          const text = doc.sliceString(nf, nt);
          add(nf, nt, Decoration.mark({ class: "lp-link", attributes: { "data-href": text.replace(/^<|>$/g, "") } }));
          return false;
        }

        // --- Lists ---
        if (name === "ListMark") {
          const ln = doc.lineAt(nf);
          const active = selectionTouches(state, ln.from, ln.to);
          const txt = doc.sliceString(nf, nt);
          if (/^[-*+]$/.test(txt)) {
            // Task list? The TaskMarker sits right after the mark
            const item = n.node.parent; // ListItem
            const task = item?.getChild("Task");
            if (task) {
              const tm = task.getChild("TaskMarker");
              if (tm) {
                const checked = /x/i.test(doc.sliceString(tm.from, tm.to));
                add(nf, tm.to, Decoration.replace({ widget: new CheckboxWidget(checked) }));
                return;
              }
            }
            add(nf, nt, active ? marks.dim : bullet);
          } else {
            add(nf, nt, marks.dim);
          }
          return;
        }

        // --- Blockquote ---
        if (name === "Blockquote") {
          const r = lineRange(doc, nf, nt);
          for (let p = r.from; p <= r.to;) {
            const ln = doc.lineAt(p);
            add(ln.from, ln.from, lines.quote);
            p = ln.to + 1;
          }
          return;
        }
        if (name === "QuoteMark") {
          const ln = doc.lineAt(nf);
          const active = selectionTouches(state, ln.from, ln.to);
          let end = nt;
          if (doc.sliceString(end, end + 1) === " ") end++;
          add(nf, end, active ? marks.dim : HIDE);
          return;
        }

        // --- Fenced code ---
        if (name === "FencedCode") {
          const first = doc.lineAt(nf), last = doc.lineAt(nt);
          for (let p = first.from; p <= last.to;) {
            const ln = doc.lineAt(p);
            add(ln.from, ln.from, (ln.number === first.number || ln.number === last.number) ? lines.fenceEdge : lines.fence);
            p = ln.to + 1;
          }
          return; // let CodeMark / CodeInfo / nested language be decorated by the highlighter
        }
        if (name === "CodeMark" || name === "CodeInfo") { add(nf, nt, marks.dim); return; }

        // --- Horizontal rule ---
        if (name === "HorizontalRule") {
          const ln = doc.lineAt(nf);
          const active = selectionTouches(state, ln.from, ln.to);
          add(ln.from, ln.from, lines.hr);
          add(nf, nt, active ? marks.dim : hr);
          return false;
        }

        // --- Tables: monospace so the pipes line up ---
        if (name === "Table") {
          const r = lineRange(doc, nf, nt);
          for (let p = r.from; p <= r.to;) {
            const ln = doc.lineAt(p);
            add(ln.from, ln.from, lines.table);
            p = ln.to + 1;
          }
          return;
        }
        if (name === "TableDelimiter") { add(nf, nt, marks.dim); return; }
      },
    });
  }

  // Sort: by from, then line decorations (from===to, block-ish) first, then longer ranges first for marks
  out.sort((a, b) => a.from - b.from || (a.to - a.from) - (b.to - b.from) || 0);
  const builder = new RangeSetBuilder();
  let lastReplaceEnd = -1;
  for (const d of out) {
    // Two replace decorations must not overlap; skip a replace that starts inside a previous one
    const isReplace = d.deco.spec.widget !== undefined || d.deco === HIDE || d.deco.spec.block !== undefined;
    if (isReplace && d.from < lastReplaceEnd) continue;
    try { builder.add(d.from, d.to, d.deco); } catch { continue; }
    if (isReplace) lastReplaceEnd = Math.max(lastReplaceEnd, d.to);
  }
  return builder.finish();
}

const livePreview = ViewPlugin.fromClass(class {
  constructor(view) { this.decorations = buildDecorations(view); }
  update(u) {
    if (u.docChanged || u.selectionSet || u.viewportChanged || syntaxTree(u.startState) !== syntaxTree(u.state))
      this.decorations = buildDecorations(u.view);
  }
}, {
  decorations: v => v.decorations,
  eventHandlers: {
    mousedown(e, view) {
      // Checkbox toggle
      if (e.target instanceof HTMLInputElement && e.target.classList.contains("lp-checkbox")) {
        const pos = view.posAtDOM(e.target);
        const line = view.state.doc.lineAt(pos);
        const m = line.text.match(/^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\])/);
        if (m) {
          const at = line.from + m[1].length;
          view.dispatch({ changes: { from: at, to: at + 1, insert: m[2] === " " ? "x" : " " } });
        }
        e.preventDefault();
        return true;
      }
      // Ctrl+click on a link opens it
      const a = e.target.closest?.(".lp-link");
      if (a && (e.ctrlKey || e.metaKey)) {
        const href = a.dataset.href;
        if (href) { host.post({ type: "link", href: resolveHref(href) }); e.preventDefault(); return true; }
      }
      return false;
    },
  },
});

function resolveHref(href) {
  try { return new URL(href, document.baseURI).href; } catch { return href; }
}

// ---------- editor setup ----------
let view;
let savedText = "";
let dirty = false;
let pendingExternal = null;
let readMode = false;
let mode = "markdown"; // "markdown" | "json", chosen by the host from the file extension

// Everything that differs between modes lives in this compartment and is swapped by setMode()
const modeConf = new Compartment();
function modeExtensions(m) {
  if (m === "json") return [json(), EditorView.editorAttributes.of({ class: "mode-json" })];
  return [
    markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: true }),
    livePreview,
    keymap.of([
      { key: "Mod-b", run: v => wrapSelection(v, "**") },
      { key: "Mod-i", run: v => wrapSelection(v, "*") },
    ]),
  ];
}
function setMode(m) {
  m = m === "json" ? "json" : "markdown";
  if (m === mode) return;
  mode = m;
  if (mode === "json" && readMode) toggleReadMode(); // read mode renders Markdown; not meaningful for JSON
  view.dispatch({ effects: modeConf.reconfigure(modeExtensions(mode)) });
}

function setDirty(d) {
  if (d === dirty) return;
  dirty = d;
  host.post({ type: "dirty", dirty });
}

function doSave() {
  if (!view) return true;
  const text = view.state.doc.toString();
  host.post({ type: "save", text });
  savedText = text;
  setDirty(false);
  return true;
}

function toggleReadMode() {
  if (mode === "json" && !readMode) return true;
  readMode = !readMode;
  const editorEl = document.getElementById("editor");
  const readEl = document.getElementById("content");
  if (readMode) {
    readEl.innerHTML = marked.parse(view.state.doc.toString());
    editorEl.hidden = true; readEl.hidden = false;
  } else {
    readEl.hidden = true; editorEl.hidden = false;
    view.focus();
  }
  host.post({ type: "mode", readMode });
  return true;
}

const mdKeymap = [
  { key: "Mod-s", run: doSave },
  { key: "Mod-e", run: toggleReadMode },
  { key: "Mod-o", run: () => { host.post({ type: "cmd", name: "open" }); return true; } },
  { key: "F5", run: () => { host.post({ type: "cmd", name: "reload" }); return true; } },
  { key: "Shift-Alt-f", run: () => formatJson() },
];

// ---------- JSON pretty print ----------
// Re-indents by walking tokens and copying every string/number/literal verbatim. JSON.stringify(JSON.parse())
// would be shorter but rewrites values: large integer IDs lose precision, 1.0 becomes 1, \u escapes get decoded.
function formatJson() {
  if (mode !== "json" || !view) return false;
  const text = view.state.doc.toString();
  try { JSON.parse(text); }
  catch (e) {
    host.post({ type: "error", title: "JSON 정렬 실패", message: jsonErrorMessage(text, e) });
    return true;
  }
  const out = prettyJson(text, detectIndent(text));
  if (out !== text) {
    view.dispatch({ changes: { from: 0, to: text.length, insert: out }, scrollIntoView: true });
  }
  return true;
}

// Keep the file's own indent style when it has one (first indented line), otherwise two spaces
function detectIndent(text) {
  const m = text.match(/\n([ \t]+)\S/);
  if (!m) return "  ";
  return m[1][0] === "\t" ? "\t" : " ".repeat(Math.min(m[1].length, 8));
}

function prettyJson(text, indent) {
  let out = "", depth = 0, i = 0;
  const n = text.length;
  const newline = () => { out += "\n" + indent.repeat(depth); };
  const nextSignificant = (from) => { let j = from; while (j < n && /\s/.test(text[j])) j++; return text[j]; };
  while (i < n) {
    const ch = text[i];
    if (ch === '"') {
      let j = i + 1;
      while (j < n && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (ch === "{" || ch === "[") {
      const close = ch === "{" ? "}" : "]";
      if (nextSignificant(i + 1) === close) { // keep empty {} / [] on one line
        out += ch + close;
        i = text.indexOf(close, i + 1) + 1;
      } else {
        out += ch; depth++; newline(); i++;
      }
    } else if (ch === "}" || ch === "]") {
      depth--; newline(); out += ch; i++;
    } else if (ch === ",") {
      out += ","; newline(); i++;
    } else if (ch === ":") {
      out += ": "; i++;
    } else if (/\s/.test(ch)) {
      i++;
    } else {
      let j = i;
      while (j < n && !/[\s,:{}\[\]"]/.test(text[j])) j++;
      out += text.slice(i, j);
      i = j;
    }
  }
  return text.endsWith("\n") ? out + "\n" : out;
}

// "Unexpected token } in JSON at position 120" -> add a line/column the user can find
function jsonErrorMessage(text, e) {
  const msg = String(e.message || e);
  const m = msg.match(/position (\d+)/) || msg.match(/line (\d+) column (\d+)/);
  if (m && m.length === 2) {
    const pos = Math.min(+m[1], text.length);
    const before = text.slice(0, pos).split("\n");
    return `${before.length}번째 줄, ${before[before.length - 1].length + 1}번째 칸 근처에 문법 오류가 있습니다.\n\n${msg}`;
  }
  return msg;
}

// ---------- folding ----------
// Folds come from the language: JSON objects/arrays, Markdown sections under a heading (and fenced code / lists).
// They only hide text on screen; the document and the saved file are untouched.
// The placeholder says how much is hidden: "… 4개" (JSON members) or "… 12줄" (Markdown lines).
function foldSummary(state, range) {
  if (mode === "json") {
    let node = syntaxTree(state).resolveInner(range.from, 1);
    while (node && node.name !== "Object" && node.name !== "Array") node = node.parent;
    if (node) {
      const members = /^(Property|Object|Array|String|Number|True|False|Null)$/;
      let count = 0;
      for (let c = node.firstChild; c; c = c.nextSibling) if (members.test(c.name)) count++;
      return `${count}개`;
    }
  }
  const lines = state.doc.lineAt(range.to).number - state.doc.lineAt(range.from).number;
  return lines > 0 ? `${lines}줄` : "";
}
const folding = [
  codeFolding({
    preparePlaceholder: foldSummary,
    placeholderDOM(view, onclick, summary) {
      const s = document.createElement("span");
      s.className = "cm-foldPlaceholder";
      s.textContent = summary ? `… ${summary}` : "…";
      s.title = "펼치기";
      s.onclick = onclick;
      return s;
    },
  }),
  foldGutter({ openText: "⌄", closedText: "›" }),
];

// Wrap each selection in a marker pair (e.g. **bold**); keeps the original text selected afterwards
function wrapSelection(v, wrap) {
  const len = wrap.length;
  v.dispatch(v.state.changeByRange(r => ({
    changes: [{ from: r.from, insert: wrap }, { from: r.to, insert: wrap }],
    range: EditorSelection.range(r.from + len, r.to + len),
  })));
  return true;
}

function createView(parent) {
  const state = EditorState.create({
    doc: "",
    extensions: [
      history(),
      drawSelection(),
      dropCursor(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      indentUnit.of("  "),
      EditorView.lineWrapping,
      modeConf.of(modeExtensions(mode)),
      syntaxHighlighting(classHighlighter),
      folding,
      keymap.of([...mdKeymap, ...foldKeymap, indentWithTab, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      EditorView.updateListener.of(u => {
        if (u.docChanged) setDirty(u.state.doc.toString() !== savedText);
      }),
    ],
  });
  return new EditorView({ state, parent });
}

// ---------- public API used by the host ----------
window.editor = {
  init() {
    view = createView(document.getElementById("editor"));
    return view;
  },
  /** Replace the document (new file or external reload). mode: "markdown" | "json" (default markdown). */
  setDoc(text, baseHref, docMode) {
    if (docMode !== undefined) setMode(docMode);
    let base = document.querySelector("base");
    if (!base) { base = document.createElement("base"); document.head.appendChild(base); }
    base.href = baseHref || "";
    savedText = text;
    pendingExternal = null;
    hideBanner();
    hideDropzone();
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, selection: { anchor: 0 } });
    setDirty(false);
    if (readMode) document.getElementById("content").innerHTML = marked.parse(text);
    view.scrollDOM.scrollTop = 0;
    if (!readMode) view.focus();
  },
  /** The file changed on disk. Apply silently if we have no unsaved edits; otherwise offer a reload. */
  externalChanged(text) {
    if (text === view.state.doc.toString()) { savedText = text; setDirty(false); return; }
    if (!dirty) {
      const sel = view.state.selection.main.head;
      const top = view.scrollDOM.scrollTop;
      savedText = text;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text },
                      selection: { anchor: Math.min(sel, text.length) } });
      view.scrollDOM.scrollTop = top;
      setDirty(false);
      if (readMode) document.getElementById("content").innerHTML = marked.parse(text);
    } else {
      pendingExternal = text;
      showBanner();
    }
  },
  getDoc() { return view.state.doc.toString(); },
  get view() { return view; },
  isDirty() { return dirty; },
  save: doSave,
  toggleReadMode,
  formatJson,
};

function showBanner() {
  const b = document.getElementById("banner");
  b.hidden = false;
}
function hideBanner() { document.getElementById("banner").hidden = true; }
document.getElementById("banner-reload").addEventListener("click", () => {
  if (pendingExternal != null) { const t = pendingExternal; window.editor.setDoc(t, document.querySelector("base")?.href); }
});
document.getElementById("banner-keep").addEventListener("click", () => { pendingExternal = null; hideBanner(); });

// ---------- file drop → host ----------
// CodeMirror reads dropped files and inserts their text. We want the host to open the file instead, so while a
// file is being dragged we cover the page with a non-editable overlay. Nothing calls preventDefault on it, so the
// drop falls through to the browser default (file:// navigation), which the host intercepts and turns into an open.
// Because the drop is never accepted by the page, no drop/dragleave event reaches us when it ends — so visibility
// runs on a heartbeat: dragover fires continuously during a drag, and half a second of silence means it is over.
const dropzone = document.getElementById("dropzone");
let dropzoneTimer = null;
document.addEventListener("dragover", e => {
  if (!dropzone || !Array.from(e.dataTransfer?.types || []).includes("Files")) return;
  dropzone.hidden = false;
  clearTimeout(dropzoneTimer);
  dropzoneTimer = setTimeout(() => { dropzone.hidden = true; }, 500);
}, true);
function hideDropzone() { clearTimeout(dropzoneTimer); if (dropzone) dropzone.hidden = true; }

window.editor.init();
