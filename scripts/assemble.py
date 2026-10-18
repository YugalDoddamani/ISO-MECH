from pathlib import Path
p=Path(__file__).resolve().parent.parent
s=(p/'page-shell.html').read_text().replace('<!--LIBRARIES-->','<script>'+ (p/'three.min.js').read_text()+'</script>\n<script>'+ (p/'OrbitControls.js').read_text()+'</script>').replace('<!--PILE_DRILL-->','<script>'+ (p/'pile-drill.js').read_text()+'</script>').replace('//APPLICATION',(p/'excavator-app.js').read_text())
(p/'excavator.html').write_text(s)
(p/'index.html').write_text(s)
