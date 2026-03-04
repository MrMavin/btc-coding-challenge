import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <title>BTC Price Betting</title>
        <meta name="description" content="Bet on Bitcoin price direction" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
