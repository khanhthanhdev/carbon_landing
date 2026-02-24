type JsonLdProps = {
  data: object | object[];
};

export function JsonLd({ data }: JsonLdProps) {
  const jsonLdArray = Array.isArray(data) ? data : [data];
  const getSchemaKey = (item: object) => {
    const schema = item as {
      "@id"?: string;
      "@type"?: string;
      url?: string;
      name?: string;
    };
    if (schema["@id"]) {
      return schema["@id"];
    }
    if (typeof schema.url === "string") {
      return `${schema["@type"] ?? "schema"}-${schema.url}`;
    }
    if (typeof schema.name === "string") {
      return `${schema["@type"] ?? "schema"}-${schema.name}`;
    }
    return JSON.stringify(item);
  };

  return (
    <>
      {jsonLdArray.map((item) => (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
          key={getSchemaKey(item)}
          type="application/ld+json"
        />
      ))}
    </>
  );
}
