import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  maxHeight?: string;
}

/**
 * 代码高亮组件
 * @param code - 代码内容
 * @param language - 编程语言，默认 auto 检测
 * @param className - 自定义样式
 * @param maxHeight - 最大高度，默认 400px
 */
export function CodeBlock({
  code,
  language = "python",
  className,
  maxHeight = "400px",
}: CodeBlockProps) {
  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden border border-white/10",
        className
      )}
    >
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "var(--color-charcoal, #1a1a1f)",
          fontSize: "0.875rem",
          lineHeight: "1.5",
          maxHeight,
          overflow: "auto",
        }}
        showLineNumbers
        lineNumberStyle={{
          minWidth: "2.5em",
          paddingRight: "1em",
          color: "#6e7681",
          userSelect: "none",
        }}
        wrapLines
      >
        {code || "// 无代码内容"}
      </SyntaxHighlighter>
    </div>
  );
}
