function Layout({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#f0f0f0",
      }}
    >
      {/* Header */}
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          backgroundColor: "#FFCC00",
          border: "3px solid black",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "Comic Sans MS, Arial",
            color: "#FF0066",
            margin: 0,
          }}
        >
          🍳 AWESOME RECIPE COOKBOOK 🍳
        </h1>
      </div>

      {/* Navigation */}
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          backgroundColor: "#00CCFF",
          border: "2px solid black",
          padding: "10px",
          textAlign: "center",
        }}
      >
        <a
          href="/"
          style={{
            fontFamily: "Arial",
            color: "white",
            fontSize: "18px",
            fontWeight: "bold",
            textDecoration: "none",
          }}
        >
          🏠 HOME
        </a>
      </div>

      {/* Content */}
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          backgroundColor: "white",
          border: "2px solid black",
          padding: "20px",
          flexGrow: 1,
        }}
      >
        {children}
      </div>

      {/* Footer */}
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          backgroundColor: "#00FF00",
          border: "2px solid black",
          padding: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            display: "inline-block",
            animation: "marquee 10s linear infinite",
            fontFamily: "Arial",
            fontSize: "12px",
          }}
        >
          ✨ Welcome to the best recipe site on the World Wide Web! ✨
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Layout>
      <h2>Velkommen!</h2>
      <p>Her kommer dine opskrifter.</p>
    </Layout>
  );
}

export default App;
