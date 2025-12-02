# Syntax Highlighting - Quick Start

## 📝 Como Usar

Escreva código em markdown usando blocos com três backticks:

### JavaScript
```javascript
function hello() {
    console.log("Hello, World!");
    return true;
}
```

### Python
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
```

### SQL
```sql
SELECT users.id, users.name, COUNT(posts.id) as post_count
FROM users
LEFT JOIN posts ON users.id = posts.user_id
GROUP BY users.id, users.name
ORDER BY post_count DESC;
```

### HTML
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Page</title>
</head>
<body>
    <h1>Welcome</h1>
</body>
</html>
```

### CSS
```css
.container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}
```

### Bash
```bash
#!/bin/bash
echo "Hello World"
for i in {1..5}; do
    echo "Number: $i"
done
```

### JSON
```json
{
    "name": "md2pdf",
    "version": "2.1.0",
    "features": [
        "Markdown to PDF",
        "Syntax Highlighting",
        "Image Optimization"
    ]
}
```

## 🔤 Código Inline

Use backticks simples para código inline: `const x = 10;` ou `function test() {}`.

## 🎨 Tema

O tema é **GitHub Light** - limpo, profissional e legível em impressão.

## 📊 Linguagens Suportadas

190+ linguagens incluindo:
- JavaScript, Python, Java, C++, C#
- PHP, Ruby, Go, Rust, Swift, Kotlin
- SQL, HTML, CSS, SCSS, LESS
- Bash, PowerShell, Python, Perl
- JSON, YAML, XML, Markdown
- E muitas outras...

## ⚙️ Auto-Detect

Se não especificar a linguagem, highlight.js tenta detectar automaticamente:

```
function test() {
    return "auto-detected";
}
```

## 🖨️ Impressão

Syntax highlighting funciona perfeitamente em PDF e impressão.

Use `Ctrl+Shift+P` (ou `Cmd+Shift+P` no Mac) para preview de impressão.

## 📖 Documentação Completa

Para mais detalhes, leia [SYNTAX_HIGHLIGHTING.md](./SYNTAX_HIGHLIGHTING.md)

---

Versão: 2.1.0  
Data: 2 de Dezembro de 2024
