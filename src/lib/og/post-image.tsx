type PostImageProps = {
  title: string;
  description?: string | null;
};

const clampTitleLines = 3;
const clampDescriptionLines = 2;

export function PostImage({ title, description }: PostImageProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        background: "#141416",
        color: "#f5f5f5",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        <div
          style={{
            fontFamily: "CMU Serif",
            fontSize: "72px",
            fontWeight: 700,
            lineHeight: 1.05,
            textWrap: "balance",
            textOverflow: "ellipsis",
            lineClamp: clampTitleLines,
          }}
        >
          {title}
        </div>
        {description ? (
          <div
            style={{
              fontFamily: "CMU Sans Serif",
              fontSize: "30px",
              fontWeight: 400,
              lineHeight: 1.4,
              color: "#b9b9c4",
              textWrap: "balance",
              textOverflow: "ellipsis",
              lineClamp: clampDescriptionLines,
            }}
          >
            {description}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontFamily: "CMU Sans Serif",
            fontSize: "22px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#b9b9c4",
          }}
        >
          caulk.lol
        </div>
      </div>
    </div>
  );
}
