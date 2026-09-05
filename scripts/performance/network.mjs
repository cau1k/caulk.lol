/** CDP URLPattern syntax differs from glob syntax: empty applies to every URL. */
export async function configureNetwork(cdp, profile) {
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpuRate });
  await cdp.send("Network.emulateNetworkConditionsByRule", {
    offline: false,
    matchedNetworkConditions: [
      {
        // https://chromedevtools.github.io/devtools-protocol/tot/Network/#type-NetworkConditions
        urlPattern: "",
        latency: profile.latencyMs,
        downloadThroughput: profile.downloadBytesPerSecond,
        uploadThroughput: profile.uploadBytesPerSecond,
      },
    ],
  });
}
