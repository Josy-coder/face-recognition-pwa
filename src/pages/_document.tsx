import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <meta charSet="utf-8" />
                {/* Remove viewport meta tag from here - it's now in _app.tsx */}
                <meta name="description" content="Face Recognition Application using AWS Rekognition" />

                {/* PWA primary color */}
                <meta name="theme-color" content="#4f46e5" />

                {/* PWA manifest */}
                <link rel="manifest" href="/manifest.json" />

                {/* PWA icons */}
                <link rel="icon" href="/icons/favicon.ico" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
                <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
                <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-152x152.png" />

                {/* iOS PWA specific */}
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="FaceRecog" />

                {/* Windows PWA tile */}
                <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
                <meta name="msapplication-TileColor" content="#4f46e5" />

                {/* Safari pinned tab */}
                <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#4f46e5" />

                {/* Service worker registration */}
                <script src="/sw-register.js" defer></script>
            </Head>
            <body className="antialiased">
            <Main />
            <NextScript />
            </body>
        </Html>
    )
}