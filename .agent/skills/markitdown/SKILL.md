---
name: markitdown
description: A tool to convert various document formats (PDF, Word, Excel, PowerPoint, HTML) into Markdown.
---

# MarkItDown Skill

This skill allows you (the AI agent) to read, analyze, and convert complex document formats into Markdown using Microsoft's `markitdown` Python utility. 

## Supported Formats
- **PDF** (`.pdf`)
- **Word** (`.docx`)
- **Excel** (`.xlsx`, `.xls`)
- **PowerPoint** (`.pptx`)
- **HTML** (`.html`)
- **Zip files** (`.zip`)

## Prerequisites
The user has already installed the tool via:
`pip install markitdown`

## How to Use via CLI

When the user asks you to extract text, summarize, or read a PDF, Word, Excel, or HTML file, you should run the following command using your terminal tool:

```bash
markitdown <path_to_file>
```

If you need to save the output to a file instead of just reading it in the terminal, use standard redirection:
```bash
markitdown <path_to_file> > <path_to_output.md>
```

## How to Use via Python API

If you need to use it within a Python script to process files programmatically, use the following snippet:

```python
from markitdown import MarkItDown

markitdown = MarkItDown()
result = markitdown.convert("your_file.xlsx")
print(result.text_content)
```

## AI Guidelines for Usage
1. **Binary Files:** Always prefer using `markitdown` over `cat` or `type` when dealing with non-text or binary formats (PDF, Excel, Word).
2. **Context Window Safety:** If the document is expected to be very large (e.g., an Excel file with thousands of rows), redirect the output to a temporary `.md` file first, then use your file reading tools to view it.
3. **Information Extraction:** This tool is excellent for extracting tabular data from Excel/Word into Markdown tables, which you can then parse and understand perfectly.
