(async () => {
  const out = [];
  const md = `# Tildoc 테스트

GitHub 스타일로 렌더링됩니다. **굵게**, *기울임*, ~~취소선~~, \`인라인 코드\`, [링크](https://github.com)도 됩니다.

## 코드

\`\`\`csharp
public static int Add(int a, int b) => a + b;
\`\`\`

## 표 / 체크리스트

| 항목 | 상태 |
|------|------|
| 열기 | ✅ |

- [x] 드래그 & 드롭
- [ ] 아직 안 한 것
- 일반 항목
  - 중첩 항목
1. 번호 목록

---

> 인용문도 됩니다.

![그림](nonexistent.png)

마지막 줄입니다.`;
  editor.setDoc(md, '');
  const view = editor.view;
  await new Promise(r => setTimeout(r, 300));
  const key = (k, code) => view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: k, keyCode: code, bubbles: true }));
  const lineOf = () => view.state.doc.lineAt(view.state.selection.main.head).number;
  const total = view.state.doc.lines;

  // 1) ArrowDown from the top must visit every line exactly once, in order
  view.dispatch({ selection: { anchor: 0 } });
  const down = [lineOf()];
  for (let i = 0; i < total + 3; i++) { key('ArrowDown', 40); await new Promise(r => setTimeout(r, 10)); down.push(lineOf()); }
  const expectDown = Array.from({ length: total }, (_, i) => i + 1);
  const downOk = JSON.stringify(down.slice(0, total)) === JSON.stringify(expectDown) && down[down.length - 1] === total;
  out.push(`DOWN ${downOk ? 'OK' : 'FAIL'} ${JSON.stringify(down)}`);

  // 2) ArrowUp from the bottom must visit every line in reverse
  view.dispatch({ selection: { anchor: view.state.doc.length } });
  const up = [lineOf()];
  for (let i = 0; i < total + 3; i++) { key('ArrowUp', 38); await new Promise(r => setTimeout(r, 10)); up.push(lineOf()); }
  const expectUp = Array.from({ length: total }, (_, i) => total - i);
  const upOk = JSON.stringify(up.slice(0, total)) === JSON.stringify(expectUp) && up[up.length - 1] === 1;
  out.push(`UP ${upOk ? 'OK' : 'FAIL'} ${JSON.stringify(up)}`);

  // 3) goal column: start mid-line on the body text, go down 2 (blank, heading) and back up 2 -> same column
  const l3 = view.state.doc.line(3);
  view.dispatch({ selection: { anchor: l3.from + 12 } });
  key('ArrowDown', 40); await new Promise(r => setTimeout(r, 10));
  key('ArrowDown', 40); await new Promise(r => setTimeout(r, 10));
  key('ArrowUp', 38); await new Promise(r => setTimeout(r, 10));
  key('ArrowUp', 38); await new Promise(r => setTimeout(r, 10));
  const back = view.state.selection.main.head - l3.from;
  out.push(`GOALCOL ${back === 12 ? 'OK' : 'FAIL'} start=12 back=${back}`);

  document.title = 'NAVTEST ' + out.join(' || ');
  const pre = document.createElement('pre'); pre.id = 'result'; pre.textContent = out.join('\n'); document.body.appendChild(pre);
})();
