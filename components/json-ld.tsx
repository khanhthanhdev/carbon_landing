type JsonLdProps = {
  data: object | object[];
};

export function JsonLd({ data }: JsonLdProps) {
  const jsonLdArray = Array.isArray(data) ? data : [data];
  
  return (
    <>
      {jsonLdArray.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
