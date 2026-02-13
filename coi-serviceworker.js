/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("message", (ev) => {
        if (!ev.data) {
            return;
        } else if (ev.data.type === "deregister") {
            self.registration.unregister().then(() => {
                return self.clients.matchAll();
            }).then(clients => {
                clients.forEach((client) => client.navigate(client.url));
            });
        } else if (ev.data.type === "coepCredentialless") {
            coepCredentialless = ev.data.value;
        }
    });

    self.addEventListener("fetch", function (event) {
        const r = event.request;
        if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
            return;
        }

        const request = (coepCredentialless && r.mode === "no-cors" && r.destination === "image") ?
            new Request(r, {
                credentials: "omit"
            }) : r;
        event.respondWith(
            fetch(request).then((response) => {
                if (response.status === 0) {
                    return response;
                }

                const newHeaders = new Headers(response.headers);
                newHeaders.set("Cross-Origin-Embedder-Policy",
                    coepCredentialless ? "credentialless" : "require-corp"
                );
                if (!newHeaders.get("Cross-Origin-Opener-Policy")) {
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
                }

                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });
            })
        );
    });

} else {
    (async function () {
        if (window.crossOriginIsolated !== false) return;

        let registration = await navigator.serviceWorker.register(window.document.currentScript.src).catch(e => console.error("COI: ", e));
        if (registration) {
            console.log("COI: Registration successful, scope is:", registration.scope);
            registration.addEventListener("updatefound", () => {
                console.log("COI: Reloading page to make use of updated service worker.");
                window.location.reload();
            });

            if (registration.active && !navigator.serviceWorker.controller) {
                console.log("COI: Reloading page to make use of service worker.");
                window.location.reload();
            }
        }
    })();
}
