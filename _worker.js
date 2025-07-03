import { connect } from "cloudflare:sockets";
// import { createHash, createDecipheriv } from "node:crypto";
// import { Buffer } from "node:buffer";

// Variables
const rootDomain = "bangmajdi.dpdns.org"; // Ganti dengan domain utama kalian
const serviceName = "tkc"; // Ganti dengan nama workers kalian
const apiKey = "9bc4cdcb54a639efa7fc45d42726f4ef354cb"; // Ganti dengan Global API key kalian (https://dash.cloudflare.com/profile/api-tokens)
const apiEmail = "Ujicobaaa1@hotmail.com"; // Ganti dengan email yang kalian gunakan
const accountID = "77be4a20aa08bb696266333b90dbc1b0"; // Ganti dengan Account ID kalian (https://dash.cloudflare.com -> Klik domain yang kalian gunakan)
const zoneID = "d60b27b8f10f948154134dc7aaa259e9"; // Ganti dengan Zone ID kalian (https://dash.cloudflare.com -> Klik domain yang kalian gunakan)
let isApiReady = false;
let proxyIP = "";
let cachedProxyList = [];

// Constant
const APP_DOMAIN = `${serviceName}.${rootDomain}`;
const PORTS = [443, 80];
const PROTOCOLS = [reverse("najort"), reverse("sselv"), reverse("ss"), reverse("ssemv")];
const KV_PROXY_URL = "https://raw.githubusercontent.com/FoolVPN-ID/Nautica/refs/heads/main/kvProxyList.json";
const PROXY_BANK_URL = "https://raw.githubusercontent.com/FoolVPN-ID/Nautica/refs/heads/main/proxyList.txt";
const DNS_SERVER_ADDRESS = "8.8.8.8";
const DNS_SERVER_PORT = 53;
const PROXY_HEALTH_CHECK_API = "https://id1.foolvpn.me/api/v1/check";
const CONVERTER_URL = "https://api.foolvpn.me/convert";
const DONATE_LINK = "https://trakteer.id/dickymuliafiqri/tip";
const BAD_WORDS_LIST =
  "https://gist.githubusercontent.com/adierebel/a69396d79b787b84d89b45002cb37cd6/raw/6df5f8728b18699496ad588b3953931078ab9cf1/kata-kasar.txt";
const PROXY_PER_PAGE = 24;
const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;
const CORS_HEADER_OPTIONS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Helper function to handle Unicode characters in btoa
function btoa_utf8(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

async function getKVProxyList(kvProxyUrl = KV_PROXY_URL) {
  if (!kvProxyUrl) throw new Error("No KV Proxy URL Provided!");
  const kvProxy = await fetch(kvProxyUrl);
  return kvProxy.status === 200 ? await kvProxy.json() : {};
}

async function getProxyList(proxyBankUrl = PROXY_BANK_URL) {
  if (!proxyBankUrl) throw new Error("No Proxy Bank URL Provided!");
  const proxyBank = await fetch(proxyBankUrl);
  if (proxyBank.status === 200) {
    const text = (await proxyBank.text()) || "";
    cachedProxyList = text.split("\n").filter(Boolean).map((entry) => {
      const [proxyIP, proxyPort, country, org] = entry.split(",");
      return {
        proxyIP: proxyIP || "Unknown",
        proxyPort: proxyPort || "Unknown",
        country: country || "Unknown",
        org: org || "Unknown Org",
      };
    });
  }
  return cachedProxyList;
}

async function reverseProxy(request, target, targetPath) {
  const targetUrl = new URL(request.url);
  const targetChunk = target.split(":");
  targetUrl.hostname = targetChunk[0];
  targetUrl.port = targetChunk[1]?.toString() || "443";
  targetUrl.pathname = targetPath || targetUrl.pathname;
  const modifiedRequest = new Request(targetUrl, request);
  modifiedRequest.headers.set("X-Forwarded-Host", request.headers.get("Host"));
  const response = await fetch(modifiedRequest);
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(CORS_HEADER_OPTIONS)) {
    newResponse.headers.set(key, value);
  }
  newResponse.headers.set("X-Proxied-By", "Cloudflare Worker");
  return newResponse;
}

function getAllConfig(request, hostName, proxyList, page = 0) {
  const startIndex = PROXY_PER_PAGE * page;
  try {
    const uuid = crypto.randomUUID();
    const document = new Document(request);
    document.setTitle("Welcome to <span class='text-blue-500 font-semibold'>Nautica</span>");
    document.addInfo(`Total: ${proxyList.length}`);
    document.addInfo(`Page: ${page}/${Math.floor(proxyList.length / PROXY_PER_PAGE)}`);

    for (let i = startIndex; i < startIndex + PROXY_PER_PAGE; i++) {
      const proxy = proxyList[i];
      if (!proxy) break;
      const { proxyIP, proxyPort, country, org } = proxy;
      const proxies = [];
      for (const port of PORTS) {
        const hashName = `${i + 1} ${getFlagEmoji(country)} ${org} WS ${port == 443 ? "TLS" : "NTLS"} [${serviceName}]`;
        for (const protocol of PROTOCOLS) {
          if (protocol === reverse("ssemv")) {
            const vmessConfig = {
              v: "2",
              ps: hashName,
              add: hostName,
              port: port.toString(),
              id: uuid,
              aid: "0",
              scy: "auto",
              net: "ws",
              type: "none",
              host: hostName,
              path: `/${proxyIP}-${proxyPort}`,
              tls: port === 443 ? "tls" : "",
              sni: hostName,
              alpn: ""
            };
            proxies.push("vmess://" + btoa_utf8(JSON.stringify(vmessConfig)));
          } else {
            const uri = new URL(`${protocol}://${hostName}`);
            uri.port = port.toString();
            uri.hash = hashName;
            uri.searchParams.set("path", `/${proxyIP}-${proxyPort}`);
            uri.searchParams.set("type", "ws");
            uri.searchParams.set("host", hostName);
            uri.searchParams.set("encryption", "none");
            uri.searchParams.set("security", port === 443 ? "tls" : "none");
            uri.searchParams.set("sni", port === 80 && protocol === reverse("sselv") ? "" : hostName);
            if (protocol === "ss") {
              uri.username = btoa(`none:${uuid}`);
              uri.searchParams.set("plugin", `v2ray-plugin;tls=${port === 443};mux=0;mode=websocket;path=/${proxyIP}-${proxyPort};host=${hostName}`);
            } else {
              uri.username = uuid;
            }
            proxies.push(uri.toString());
          }
        }
      }
      document.registerProxies({ proxyIP, proxyPort, country, org }, proxies);
    }
    document.addPageButton("Prev", `/sub/${page > 0 ? page - 1 : 0}`, page > 0 ? false : true);
    document.addPageButton("Next", `/sub/${page + 1}`, page < Math.floor(proxyList.length / 10) ? false : true);
    return document.build();
  } catch (error) {
    return `An error occurred while generating configurations: ${error.stack}`;
  }
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (apiKey && apiEmail && accountID && zoneID) isApiReady = true;
      if (request.headers.get("Upgrade") === "websocket") {
        const proxyMatch = url.pathname.match(/^\/(.+[:=-]\d+)$/);
        if (url.pathname.length === 3 || url.pathname.includes(",")) {
          const proxyKeys = url.pathname.replace("/", "").toUpperCase().split(",");
          const proxyKey = proxyKeys[Math.floor(Math.random() * proxyKeys.length)];
          const kvProxy = await getKVProxyList();
          if (kvProxy && kvProxy[proxyKey]) {
            proxyIP = kvProxy[proxyKey][Math.floor(Math.random() * kvProxy[proxyKey].length)];
          }
        } else if (proxyMatch) {
          proxyIP = proxyMatch[1];
        }
        return await websocketHandler(request);
      }
      if (url.pathname.startsWith("/sub")) {
        const page = url.pathname.match(/^\/sub\/(\d+)$/);
        const pageIndex = parseInt(page ? page[1] : "0");
        const hostname = request.headers.get("Host");
        const countrySelect = url.searchParams.get("cc")?.split(",");
        const proxyBankUrl = url.searchParams.get("proxy-list") || env.PROXY_BANK_URL;
        let proxyList = (await getProxyList(proxyBankUrl)).filter(p => !countrySelect || countrySelect.includes(p.country));
        const result = getAllConfig(request, hostname, proxyList, pageIndex);
        return new Response(result, { status: 200, headers: { "Content-Type": "text/html;charset=utf-8" } });
      }
      // Other routes...
      const targetReverseProxy = env.REVERSE_PROXY_TARGET || "example.com";
      return await reverseProxy(request, targetReverseProxy);
    } catch (err) {
      return new Response(`An error occurred: ${err.toString()}`, { status: 500, headers: { ...CORS_HEADER_OPTIONS } });
    }
  },
};

async function websocketHandler(request) {
  const webSocketPair = new WebSocketPair();
  const [client, webSocket] = Object.values(webSocketPair);
  webSocket.accept();

  let addressLog = "", portLog = "";
  const log = (info, event) => console.log(`[${addressLog}:${portLog}] ${info}`, event || "");
  const earlyDataHeader = request.headers.get("sec-websocket-protocol") || "";
  const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);
  let remoteSocketWrapper = { value: null };
  let isDNS = false;

  readableWebSocketStream.pipeTo(new WritableStream({
    async write(chunk) {
      if (isDNS) return handleUDPOutbound(DNS_SERVER_ADDRESS, DNS_SERVER_PORT, chunk, webSocket, null, log);
      if (remoteSocketWrapper.value) {
        const writer = remoteSocketWrapper.value.writable.getWriter();
        await writer.write(chunk);
        writer.releaseLock();
        return;
      }

      const protocol = await protocolSniffer(chunk);
      let protocolHeader;

      if (protocol === reverse("najorT")) protocolHeader = parseNajortHeader(chunk);
      else if (protocol === reverse("sselv")) protocolHeader = parseSselvHeader(chunk);
      else if (protocol === reverse("ssemv")) protocolHeader = parseVmessHeader(chunk); // Dedicated Vmess parser
      else if (protocol === reverse("skcoswodahS")) protocolHeader = parseSsHeader(chunk);
      else throw new Error("Unknown Protocol!");

      addressLog = protocolHeader.addressRemote;
      portLog = `${protocolHeader.portRemote} -> ${protocolHeader.isUDP ? "UDP" : "TCP"}`;
      if (protocolHeader.hasError) throw new Error(protocolHeader.message);
      if (protocolHeader.isUDP) {
        if (protocolHeader.portRemote === 53) isDNS = true;
        else throw new Error("UDP only support for DNS port 53");
      }
      if (isDNS) return handleUDPOutbound(DNS_SERVER_ADDRESS, DNS_SERVER_PORT, chunk, webSocket, protocolHeader.version, log);
      handleTCPOutBound(remoteSocketWrapper, protocolHeader.addressRemote, protocolHeader.portRemote, protocolHeader.rawClientData, webSocket, protocolHeader.version, log);
    },
    close: () => log("readableWebSocketStream is close"),
    abort: (reason) => log("readableWebSocketStream is abort", JSON.stringify(reason)),
  })).catch(err => log("readableWebSocketStream pipeTo error", err));

  return new Response(null, { status: 101, webSocket: client });
}

async function protocolSniffer(buffer) {
  if (buffer.byteLength >= 62) {
    const d = new Uint8Array(buffer.slice(56, 60));
    if (d[0] === 0x0d && d[1] === 0x0a && (d[2] === 0x01 || d[2] === 0x03 || d[2] === 0x7f) && (d[3] === 0x01 || d[3] === 0x03 || d[3] === 0x04)) {
      return reverse("najorT");
    }
  }
  if (buffer.byteLength > 17) {
    const version = new Uint8Array(buffer.slice(0, 1))[0];
    const uuidSlice = buffer.slice(1, 17);
    if (arrayBufferToHex(uuidSlice).match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      if (version === 0) return reverse("sselv");
      return reverse("ssemv"); // Identify Vmess by its version byte (non-zero)
    }
  }
  return reverse("skcoswodahS");
}

async function handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, responseHeader, log) {
  async function connectAndWrite(address, port) {
    const tcpSocket = connect({ hostname: address, port: port });
    remoteSocket.value = tcpSocket;
    log(`connected to ${address}:${port}`);
    const writer = tcpSocket.writable.getWriter();
    await writer.write(rawClientData);
    writer.releaseLock();
    return tcpSocket;
  }
  const tcpSocket = await connectAndWrite(addressRemote, portRemote);
  remoteSocketToWS(tcpSocket, webSocket, responseHeader, null, log);
}

async function remoteSocketToWS(remoteSocket, webSocket, responseHeader, retry, log) {
  let header = responseHeader;
  await remoteSocket.readable.pipeTo(new WritableStream({
    async write(chunk) {
      if (webSocket.readyState !== WS_READY_STATE_OPEN) return;
      if (header) {
        webSocket.send(await new Blob([header, chunk]).arrayBuffer());
        header = null;
      } else {
        webSocket.send(chunk);
      }
    },
    close: () => log(`remoteConnection!.readable is close`),
    abort: (reason) => console.error(`remoteConnection!.readable abort`, reason),
  })).catch(error => console.error(`remoteSocketToWS has exception `, error.stack || error));
}

// All other functions (parseSselvHeader, parseSsHeader, etc.) remain the same as your original code.
// ... [The rest of your utility functions like parseSselvHeader, parseNajortHeader, parseSsHeader, safeCloseWebSocket, etc., go here without changes]

// A dedicated parser for Vmess headers. It's similar to VLESS but we keep it separate for clarity.
function parseVmessHeader(buffer) {
    const version = new Uint8Array(buffer.slice(0, 1));
    if (version[0] > 1) { // Vmess version is typically 1
        return { hasError: true, message: `Unsupported Vmess version: ${version[0]}` };
    }
    // 16 bytes UUID
    const optLength = 0; // Vmess doesn't have VLESS's addon length field in the same way. Assume 0 for simplicity.
    const cmd = new Uint8Array(buffer.slice(17, 18))[0];
    let isUDP = false;
    if (cmd === 1) {} else if (cmd === 2) { isUDP = true; } 
    else { return { hasError: true, message: `Unsupported Vmess command: ${cmd}` }; }
    
    const portIndex = 18;
    const portRemote = new DataView(buffer.slice(portIndex, portIndex + 2)).getUint16(0);
    
    let addressIndex = portIndex + 2;
    const addressType = new Uint8Array(buffer.slice(addressIndex, addressIndex + 1))[0];
    addressIndex += 1;
    
    let addressValue = "";
    let addressLength = 0;
    switch (addressType) {
        case 1: // IPv4
            addressLength = 4;
            addressValue = new Uint8Array(buffer.slice(addressIndex, addressIndex + addressLength)).join('.');
            break;
        case 2: // Domain
            addressLength = new Uint8Array(buffer.slice(addressIndex, addressIndex + 1))[0];
            addressIndex += 1;
            addressValue = new TextDecoder().decode(buffer.slice(addressIndex, addressIndex + addressLength));
            break;
        case 3: // IPv6
            addressLength = 16;
            const ipv6 = [];
            for (let i = 0; i < 8; i++) {
                ipv6.push(new DataView(buffer).getUint16(addressIndex + i * 2, false).toString(16));
            }
            addressValue = ipv6.join(':');
            break;
        default:
            return { hasError: true, message: `Invalid Vmess address type: ${addressType}` };
    }
    
    if (!addressValue) return { hasError: true, message: "Empty Vmess address" };
    
    const rawDataIndex = addressIndex + addressLength;
    return {
        hasError: false,
        addressRemote: addressValue,
        portRemote: portRemote,
        rawClientData: buffer.slice(rawDataIndex),
        isUDP: isUDP,
        version: new Uint8Array([1, 0]), // Vmess response header
    };
}

// --- The rest of the functions from your original script should be here ---
// (makeReadableWebSocketStream, parseSsHeader, parseSselvHeader, parseNajortHeader, safeCloseWebSocket, etc.)
// (The HTML Document class and its methods)
// I am omitting them here for brevity as they are unchanged, but they must be in your final script.

// Make sure to include all the unchanged functions from your original script below this line.
// For example:
function makeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
  let readableStreamCancel = false;
  const stream = new ReadableStream({
    start(controller) {
      webSocketServer.addEventListener("message", (event) => {
        if (readableStreamCancel) return;
        controller.enqueue(event.data);
      });
      webSocketServer.addEventListener("close", () => {
        safeCloseWebSocket(webSocketServer);
        if (readableStreamCancel) return;
        controller.close();
      });
      webSocketServer.addEventListener("error", (err) => {
        log("webSocketServer has error");
        controller.error(err);
      });
      const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
      if (error) {
        controller.error(error);
      } else if (earlyData) {
        controller.enqueue(earlyData);
      }
    },
    pull(controller) {},
    cancel(reason) {
      if (readableStreamCancel) return;
      log(`ReadableStream was canceled, due to ${reason}`);
      readableStreamCancel = true;
      safeCloseWebSocket(webSocketServer);
    },
  });
  return stream;
}

function parseSsHeader(ssBuffer) {
  const view = new DataView(ssBuffer);
  const addressType = view.getUint8(0);
  let addressLength = 0;
  let addressValueIndex = 1;
  let addressValue = "";
  switch (addressType) {
    case 1:
      addressLength = 4;
      addressValue = new Uint8Array(ssBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join(".");
      break;
    case 3:
      addressLength = new Uint8Array(ssBuffer.slice(addressValueIndex, addressValueIndex + 1))[0];
      addressValueIndex += 1;
      addressValue = new TextDecoder().decode(ssBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
      break;
    case 4:
      addressLength = 16;
      const dataView = new DataView(ssBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
      const ipv6 = [];
      for (let i = 0; i < 8; i++) {
        ipv6.push(dataView.getUint16(i * 2).toString(16));
      }
      addressValue = ipv6.join(":");
      break;
    default:
      return { hasError: true, message: `Invalid addressType for ${reverse("skcoswodahS")}: ${addressType}` };
  }
  if (!addressValue) {
    return { hasError: true, message: `Destination address empty, address type is: ${addressType}` };
  }
  const portIndex = addressValueIndex + addressLength;
  const portBuffer = ssBuffer.slice(portIndex, portIndex + 2);
  const portRemote = new DataView(portBuffer).getUint16(0);
  return {
    hasError: false,
    addressRemote: addressValue,
    addressType: addressType,
    portRemote: portRemote,
    rawDataIndex: portIndex + 2,
    rawClientData: ssBuffer.slice(portIndex + 2),
    version: null,
    isUDP: portRemote == 53,
  };
}

function parseSselvHeader(buffer) {
  const version = new Uint8Array(buffer.slice(0, 1));
  let isUDP = false;
  const optLength = new Uint8Array(buffer.slice(17, 18))[0];
  const cmd = new Uint8Array(buffer.slice(18 + optLength, 18 + optLength + 1))[0];
  if (cmd === 1) {} else if (cmd === 2) {
    isUDP = true;
  } else {
    return { hasError: true, message: `command ${cmd} is not support, command 01-tcp,02-udp,03-mux` };
  }
  const portIndex = 18 + optLength + 1;
  const portBuffer = buffer.slice(portIndex, portIndex + 2);
  const portRemote = new DataView(portBuffer).getUint16(0);
  let addressIndex = portIndex + 2;
  const addressBuffer = new Uint8Array(buffer.slice(addressIndex, addressIndex + 1));
  const addressType = addressBuffer[0];
  let addressLength = 0;
  let addressValueIndex = addressIndex + 1;
  let addressValue = "";
  switch (addressType) {
    case 1:
      addressLength = 4;
      addressValue = new Uint8Array(buffer.slice(addressValueIndex, addressValueIndex + addressLength)).join(".");
      break;
    case 2:
      addressLength = new Uint8Array(buffer.slice(addressValueIndex, addressValueIndex + 1))[0];
      addressValueIndex += 1;
      addressValue = new TextDecoder().decode(buffer.slice(addressValueIndex, addressValueIndex + addressLength));
      break;
    case 3:
      addressLength = 16;
      const dataView = new DataView(buffer.slice(addressValueIndex, addressValueIndex + addressLength));
      const ipv6 = [];
      for (let i = 0; i < 8; i++) {
        ipv6.push(dataView.getUint16(i * 2).toString(16));
      }
      addressValue = ipv6.join(":");
      break;
    default:
      return { hasError: true, message: `invalid addressType is ${addressType}` };
  }
  if (!addressValue) {
    return { hasError: true, message: `addressValue is empty, addressType is ${addressType}` };
  }
  return {
    hasError: false,
    addressRemote: addressValue,
    addressType: addressType,
    portRemote: portRemote,
    rawDataIndex: addressValueIndex + addressLength,
    rawClientData: buffer.slice(addressValueIndex + addressLength),
    version: new Uint8Array([version[0], 0]),
    isUDP: isUDP,
  };
}

function parseNajortHeader(buffer) {
  const socks5DataBuffer = buffer.slice(58);
  if (socks5DataBuffer.byteLength < 6) {
    return { hasError: true, message: "invalid SOCKS5 request data" };
  }
  let isUDP = false;
  const view = new DataView(socks5DataBuffer);
  const cmd = view.getUint8(0);
  if (cmd == 3) {
    isUDP = true;
  } else if (cmd != 1) {
    throw new Error("Unsupported command type!");
  }
  let addressType = view.getUint8(1);
  let addressLength = 0;
  let addressValueIndex = 2;
  let addressValue = "";
  switch (addressType) {
    case 1:
      addressLength = 4;
      addressValue = new Uint8Array(socks5DataBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join(".");
      break;
    case 3:
      addressLength = new Uint8Array(socks5DataBuffer.slice(addressValueIndex, addressValueIndex + 1))[0];
      addressValueIndex += 1;
      addressValue = new TextDecoder().decode(socks5DataBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
      break;
    case 4:
      addressLength = 16;
      const dataView = new DataView(socks5DataBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
      const ipv6 = [];
      for (let i = 0; i < 8; i++) {
        ipv6.push(dataView.getUint16(i * 2).toString(16));
      }
      addressValue = ipv6.join(":");
      break;
    default:
      return { hasError: true, message: `invalid addressType is ${addressType}` };
  }
  if (!addressValue) {
    return { hasError: true, message: `address is empty, addressType is ${addressType}` };
  }
  const portIndex = addressValueIndex + addressLength;
  const portBuffer = socks5DataBuffer.slice(portIndex, portIndex + 2);
  const portRemote = new DataView(portBuffer).getUint16(0);
  return {
    hasError: false,
    addressRemote: addressValue,
    addressType: addressType,
    portRemote: portRemote,
    rawDataIndex: portIndex + 4,
    rawClientData: socks5DataBuffer.slice(portIndex + 4),
    version: null,
    isUDP: isUDP,
  };
}

function safeCloseWebSocket(socket) {
  try {
    if (socket.readyState === WS_READY_STATE_OPEN || socket.readyState === WS_READY_STATE_CLOSING) {
      socket.close();
    }
  } catch (error) {
    console.error("safeCloseWebSocket error", error);
  }
}

async function checkProxyHealth(proxyIP, proxyPort) {
  const req = await fetch(`${PROXY_HEALTH_CHECK_API}?ip=${proxyIP}:${proxyPort}`);
  return await req.json();
}

function base64ToArrayBuffer(base64Str) {
  if (!base64Str) {
    return { error: null };
  }
  try {
    base64Str = base64Str.replace(/-/g, "+").replace(/_/g, "/");
    const decode = atob(base64Str);
    const arryBuffer = Uint8Array.from(decode, (c) => c.charCodeAt(0));
    return { earlyData: arryBuffer.buffer, error: null };
  } catch (error) {
    return { error };
  }
}

function arrayBufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function shuffleArray(array) {
  let currentIndex = array.length;
  while (currentIndex != 0) {
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
}

function reverse(s) {
  return s.split("").reverse().join("");
}

function getFlagEmoji(isoCode) {
  const codePoints = isoCode.toUpperCase().split("").map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

class CloudflareApi {
  constructor() {
    this.bearer = `Bearer ${apiKey}`;
    this.accountID = accountID;
    this.zoneID = zoneID;
    this.apiEmail = apiEmail;
    this.apiKey = apiKey;
    this.headers = {
      Authorization: this.bearer,
      "X-Auth-Email": this.apiEmail,
      "X-Auth-Key": this.apiKey,
    };
  }
  async getDomainList() {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountID}/workers/domains`;
    const res = await fetch(url, { headers: { ...this.headers } });
    if (res.status == 200) {
      const respJson = await res.json();
      return respJson.result.filter((data) => data.service == serviceName).map((data) => data.hostname);
    }
    return [];
  }
  async registerDomain(domain) {
    domain = domain.toLowerCase();
    const registeredDomains = await this.getDomainList();
    if (!domain.endsWith(rootDomain)) return 400;
    if (registeredDomains.includes(domain)) return 409;
    try {
      const domainTest = await fetch(`https://${domain.replaceAll("." + APP_DOMAIN, "")}`);
      if (domainTest.status == 530) return domainTest.status;
      const badWordsListRes = await fetch(BAD_WORDS_LIST);
      if (badWordsListRes.status == 200) {
        const badWordsList = (await badWordsListRes.text()).split("\n");
        for (const badWord of badWordsList) {
          if (domain.includes(badWord.toLowerCase())) {
            return 403;
          }
        }
      } else {
        return 403;
      }
    } catch (e) {
      return 400;
    }
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountID}/workers/domains`;
    const res = await fetch(url, {
      method: "PUT",
      body: JSON.stringify({ environment: "production", hostname: domain, service: serviceName, zone_id: this.zoneID }),
      headers: { ...this.headers },
    });
    return res.status;
  }
}

let baseHTML = `
<!DOCTYPE html>
<html lang="en" id="html" class="scroll-auto scrollbar-hide dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Proxy List</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
    <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/lozad/dist/lozad.min.js"></script>
    <script>
      tailwind.config = { darkMode: 'selector' }
    </script>
  </head>
  <body class="bg-white dark:bg-neutral-800 bg-fixed">
    <div id="notification-badge" class="fixed z-50 opacity-0 transition-opacity ease-in-out duration-300 mt-9 mr-6 right-0 p-3 max-w-sm bg-white rounded-xl border border-2 border-neutral-800 flex items-center gap-x-4">
      <div class="shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#171717" class="size-6"><path d="M5.85 3.5a.75.75 0 0 0-1.117-1 9.719 9.719 0 0 0-2.348 4.876.75.75 0 0 0 1.479.248A8.219 8.219 0 0 1 5.85 3.5ZM19.267 2.5a.75.75 0 1 0-1.118 1 8.22 8.22 0 0 1 1.987 4.124.75.75 0 0 0 1.48-.248A9.72 9.72 0 0 0 19.266 2.5Z" /><path fill-rule="evenodd" d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25ZM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 0 0 4.496 0l.002.1a2.25 2.25 0 1 1-4.5 0Z" clip-rule="evenodd" /></svg>
      </div>
      <div>
        <div class="text-md font-bold text-blue-500">Berhasil!</div>
        <p class="text-sm text-neutral-800">Akun berhasil disalin</p>
      </div>
    </div>
    <div>
      <div class="h-full fixed top-0 w-14 bg-white dark:bg-neutral-800 border-r-2 border-neutral-800 dark:border-white z-20 overflow-y-scroll scrollbar-hide">
        <div class="text-2xl flex flex-col items-center h-full gap-2">PLACEHOLDER_BENDERA_NEGARA</div>
      </div>
    </div>
    <div id="container-header">
      <div id="container-info" class="bg-amber-400 border-2 border-neutral-800 text-right px-5">
        <div class="flex justify-end gap-3 text-sm">
          <p id="container-info-ip">IP: 127.0.0.1</p>
          <p id="container-info-country">Country: Indonesia</p>
          <p id="container-info-isp">ISP: Localhost</p>
        </div>
      </div>
    </div>
    <div class="container">
      <div id="container-title" class="sticky bg-white dark:bg-neutral-800 border-b-2 border-neutral-800 dark:border-white z-10 py-6 w-screen">
        <h1 class="text-xl text-center text-neutral-800 dark:text-white">PLACEHOLDER_JUDUL</h1>
      </div>
      <div class="flex gap-6 pt-10 w-screen justify-center">PLACEHOLDER_PROXY_GROUP</div>
      <nav id="container-pagination" class="w-screen mt-8 sticky bottom-0 right-0 left-0 transition -translate-y-6 z-20">
        <ul class="flex justify-center space-x-4">PLACEHOLDER_PAGE_BUTTON</ul>
      </nav>
    </div>
    <div id="container-window" class="hidden">
      <div class="fixed z-20 top-0 w-full h-full bg-white dark:bg-neutral-800">
        <p id="container-window-info" class="text-center w-full h-full top-1/4 absolute dark:text-white"></p>
      </div>
      <div id="output-window" class="fixed z-20 top-0 right-0 w-full h-full flex justify-center items-center hidden">
        <div class="w-[75%] h-[30%] flex flex-col gap-1 p-1 text-center rounded-md">
          <div class="basis-1/6 w-full h-full rounded-md">
            <div class="flex w-full h-full gap-1 justify-between">
              <button onclick="copyToClipboardAsTarget('clash')" class="basis-1/2 p-2 rounded-full bg-amber-400 flex justify-center items-center">Clash</button>
              <button onclick="copyToClipboardAsTarget('sfa')" class="basis-1/2 p-2 rounded-full bg-amber-400 flex justify-center items-center">SFA</button>
              <button onclick="copyToClipboardAsTarget('bfr')" class="basis-1/2 p-2 rounded-full bg-amber-400 flex justify-center items-center">BFR</button>
            </div>
          </div>
          <div class="basis-1/6 w-full h-full rounded-md">
            <div class="flex w-full h-full gap-1 justify-between">
              <button onclick="copyToClipboardAsTarget('v2ray')" class="basis-1/2 p-2 rounded-full bg-amber-400 flex justify-center items-center">V2Ray/Xray</button>
              <button onclick="copyToClipboardAsRaw()" class="basis-1/2 p-2 rounded-full bg-amber-400 flex justify-center items-center">Raw</button>
            </div>
          </div>
          <div class="basis-1/6 w-full h-full rounded-md">
            <div class="flex w-full h-full gap-1 justify-center">
              <button onclick="toggleOutputWindow()" class="basis-1/2 border-2 border-indigo-400 hover:bg-indigo-400 dark:text-white p-2 rounded-full flex justify-center items-center">Close</button>
            </div>
          </div>
        </div>
      </div>
      <div id="wildcards-window" class="fixed hidden z-20 top-0 right-0 w-full h-full flex justify-center items-center">
        <div class="w-[75%] h-[30%] flex flex-col gap-1 p-1 text-center rounded-md">
          <div class="basis-1/6 w-full h-full rounded-md">
            <div class="flex w-full h-full gap-1 justify-between">
              <input id="new-domain-input" type="text" placeholder="Input wildcard" class="basis-11/12 w-full h-full px-6 rounded-md focus:outline-0" />
              <button onclick="registerDomain()" class="p-2 rounded-full bg-amber-400 flex justify-center items-center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path fill-rule="evenodd" d="M16.72 7.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1 0 1.06l-3.75 3.75a.75.75 0 1 1-1.06-1.06l2.47-2.47H3a.75.75 0 0 1 0-1.5h16.19l-2.47-2.47a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"></path></svg></button>
            </div>
          </div>
          <div class="basis-5/6 w-full h-full rounded-md">
            <div id="container-domains" class="w-full h-full rounded-md flex flex-col gap-1 overflow-scroll scrollbar-hide"></div>
          </div>
        </div>
      </div>
    </div>
    <footer>
      <div class="fixed bottom-3 right-3 flex flex-col gap-1 z-50">
        <a href="${DONATE_LINK}" target="_blank">
          <button class="bg-green-500 rounded-full border-2 border-neutral-800 p-1 block"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 0 1-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.323.152-.691.546-1.004ZM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 0 1-.921.42Z" /><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v.816a3.836 3.836 0 0 0-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 0 1-.921-.421l-.879-.66a.75.75 0 0 0-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 0 0 1.5 0v-.81a4.124 4.124 0 0 0 1.821-.749c.745-.559 1.179-1.344 1.179-2.191 0-.847-.434-1.632-1.179-2.191a4.122 4.122 0 0 0-1.821-.75V8.354c.29.082.559.213.786.393l.415.33a.75.75 0 0 0 .933-1.175l-.415-.33a3.836 3.836 0 0 0-1.719-.755V6Z" clip-rule="evenodd" /></svg>
          </button>
        </a>
        <button onclick="toggleWildcardsWindow()" class="bg-indigo-400 rounded-full border-2 border-neutral-800 p-1 PLACEHOLDER_API_READY"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" /></svg></button>
        <button onclick="toggleDarkMode()" class="bg-amber-400 rounded-full border-2 border-neutral-800 p-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"></path></svg></button>
      </div>
    </footer>
    <script>
      const rootDomain = "${serviceName}.${rootDomain}";
      const notification = document.getElementById("notification-badge");
      const windowContainer = document.getElementById("container-window");
      const windowInfoContainer = document.getElementById("container-window-info");
      const converterUrl = "https://script.google.com/macros/s/AKfycbwwVeHNUlnP92syOP82p1dOk_-xwBgRIxkTjLhxxZ5UXicrGOEVNc5JaSOu0Bgsx_gG/exec";
      let isDomainListFetched = false;
      let rawConfig = "";
      function getDomainList() {
        if (isDomainListFetched) return;
        isDomainListFetched = true;
        windowInfoContainer.innerText = "Fetching data...";
        const url = "https://" + rootDomain + "/api/v1/domains/get";
        fetch(url).then(async (res) => {
          const domainListContainer = document.getElementById("container-domains");
          domainListContainer.innerHTML = "";
          if (res.status == 200) {
            windowInfoContainer.innerText = "Done!";
            const respJson = await res.json();
            for (const domain of respJson) {
              const domainElement = document.createElement("p");
              domainElement.classList.add("w-full", "bg-amber-400", "rounded-md");
              domainElement.innerText = domain;
              domainListContainer.appendChild(domainElement);
            }
          } else {
            windowInfoContainer.innerText = "Failed!";
          }
        });
      }
      function registerDomain() {
        const domainInputElement = document.getElementById("new-domain-input");
        const rawDomain = domainInputElement.value.toLowerCase();
        const domain = domainInputElement.value + "." + rootDomain;
        if (!rawDomain.match(/\\w+\\.\\w+$/) || rawDomain.endsWith(rootDomain)) {
          windowInfoContainer.innerText = "Invalid URL!";
          return;
        }
        windowInfoContainer.innerText = "Pushing request...";
        const url = "https://" + rootDomain + "/api/v1/domains/put?domain=" + domain;
        fetch(url).then((res) => {
          if (res.status == 200) {
            windowInfoContainer.innerText = "Done!";
            domainInputElement.value = "";
            isDomainListFetched = false;
            getDomainList();
          } else {
            if (res.status == 409) {
              windowInfoContainer.innerText = "Domain exists!";
            } else {
              windowInfoContainer.innerText = "Error " + res.status;
            }
          }
        });
      }
      function copyToClipboard(text) {
        toggleOutputWindow();
        rawConfig = text;
      }
      function copyToClipboardAsRaw() {
        navigator.clipboard.writeText(rawConfig);
        notification.classList.remove("opacity-0");
        setTimeout(() => {
          notification.classList.add("opacity-0");
        }, 2000);
      }
      async function copyToClipboardAsTarget(target) {
        windowInfoContainer.innerText = "Generating config...";
        const url = "${CONVERTER_URL}";
        const res = await fetch(url, {
          method: "POST",
          body: JSON.stringify({ url: rawConfig, format: target, template: "cf" }),
        });
        if (res.status == 200) {
          windowInfoContainer.innerText = "Done!";
          navigator.clipboard.writeText(await res.text());
          notification.classList.remove("opacity-0");
          setTimeout(() => {
            notification.classList.add("opacity-0");
          }, 2000);
        } else {
          windowInfoContainer.innerText = "Error " + res.statusText;
        }
      }
      function navigateTo(link) {
        window.location.href = link + window.location.search;
      }
      function toggleOutputWindow() {
        windowInfoContainer.innerText = "Select output:";
        toggleWindow();
        const rootElement = document.getElementById("output-window");
        if (rootElement.classList.contains("hidden")) {
          rootElement.classList.remove("hidden");
        } else {
          rootElement.classList.add("hidden");
        }
      }
      function toggleWildcardsWindow() {
        windowInfoContainer.innerText = "Domain list";
        toggleWindow();
        getDomainList();
        const rootElement = document.getElementById("wildcards-window");
        if (rootElement.classList.contains("hidden")) {
          rootElement.classList.remove("hidden");
        } else {
          rootElement.classList.add("hidden");
        }
      }
      function toggleWindow() {
        if (windowContainer.classList.contains("hidden")) {
          windowContainer.classList.remove("hidden");
        } else {
          windowContainer.classList.add("hidden");
        }
      }
      function toggleDarkMode() {
        const rootElement = document.getElementById("html");
        if (rootElement.classList.contains("dark")) {
          rootElement.classList.remove("dark");
        } else {
          rootElement.classList.add("dark");
        }
      }
      function checkProxy() {
        for (let i = 0; ; i++) {
          const pingElement = document.getElementById("ping-" + i);
          if (pingElement == undefined) return;
          const target = pingElement.textContent.split(" ").filter((ipPort) => ipPort.match(":"))[0];
          if (target) {
            pingElement.textContent = "Checking...";
          } else {
            continue;
          }
          let isActive = false;
          new Promise(async (resolve) => {
            await fetch("https://" + rootDomain + "/check?target=" + target)
              .then(async (res) => {
                if (isActive) return;
                if (res.status == 200) {
                  pingElement.classList.remove("dark:text-white");
                  const jsonResp = await res.json();
                  if (jsonResp.proxyip === true) {
                    isActive = true;
                    pingElement.textContent = "Active " + jsonResp.delay + " ms " + "(" + jsonResp.colo + ")";
                    pingElement.classList.add("text-green-600");
                  } else {
                    pingElement.textContent = "Inactive";
                    pingElement.classList.add("text-red-600");
                  }
                } else {
                  pingElement.textContent = "Check Failed!";
                }
              })
              .finally(() => {
                resolve(0);
              });
          });
        }
      }
      function checkGeoip() {
        const containerIP = document.getElementById("container-info-ip");
        const containerCountry = document.getElementById("container-info-country");
        const containerISP = document.getElementById("container-info-isp");
        fetch("https://" + rootDomain + "/api/v1/myip").then(async (res) => {
          if (res.status == 200) {
            const respJson = await res.json();
            containerIP.innerText = "IP: " + respJson.ip;
            containerCountry.innerText = "Country: " + respJson.country;
            containerISP.innerText = "ISP: " + respJson.asOrganization;
          }
        });
      }
      window.onload = () => {
        checkGeoip();
        checkProxy();
        const observer = lozad(".lozad", {
          load: function (el) {
            el.classList.remove("scale-95");
          },
        });
        observer.observe();
      };
      window.onscroll = () => {
        const paginationContainer = document.getElementById("container-pagination");
        if (window.innerHeight + Math.round(window.scrollY) >= document.body.offsetHeight) {
          paginationContainer.classList.remove("-translate-y-6");
        } else {
          paginationContainer.classList.add("-translate-y-6");
        }
      };
    </script>
  </body>
</html>`;

class Document {
  proxies = [];
  constructor(request) {
    this.html = baseHTML;
    this.request = request;
    this.url = new URL(this.request.url);
  }
  setTitle(title) {
    this.html = this.html.replaceAll("PLACEHOLDER_JUDUL", title);
  }
  addInfo(text) {
    text = `<span>${text}</span>`;
    this.html = this.html.replaceAll("PLACEHOLDER_INFO", `${text}\nPLACEHOLDER_INFO`);
  }
  registerProxies(data, proxies) {
    this.proxies.push({ ...data, list: proxies });
  }
  buildProxyGroup() {
    let proxyGroupElement = "";
    proxyGroupElement += `<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">`;
    for (let i = 0; i < this.proxies.length; i++) {
      const proxyData = this.proxies[i];
      proxyGroupElement += `<div class="lozad scale-95 mb-2 bg-white dark:bg-neutral-800 transition-transform duration-200 rounded-lg p-4 w-60 border-2 border-neutral-800">`;
      proxyGroupElement += `  <div id="countryFlag" class="absolute -translate-y-9 -translate-x-2 border-2 border-neutral-800 rounded-full overflow-hidden"><img width="32" src="https://hatscripts.github.io/circle-flags/flags/${proxyData.country.toLowerCase()}.svg" /></div>`;
      proxyGroupElement += `  <div><div id="ping-${i}" class="animate-pulse text-xs font-semibold dark:text-white">Idle ${proxyData.proxyIP}:${proxyData.proxyPort}</div></div>`;
      proxyGroupElement += `  <div class="rounded py-1 px-2 bg-amber-400 dark:bg-neutral-800 dark:border-2 dark:border-amber-400">`;
      proxyGroupElement += `    <h5 class="font-bold text-md text-neutral-900 dark:text-white mb-1 overflow-x-scroll scrollbar-hide text-nowrap">${proxyData.org}</h5>`;
      proxyGroupElement += `    <div class="text-neutral-900 dark:text-white text-sm"><p>IP: ${proxyData.proxyIP}</p><p>Port: ${proxyData.proxyPort}</p>`;
      proxyGroupElement += `      <div id="container-region-check-${i}"><input id="config-sample-${i}" class="hidden" type="text" value="${proxyData.list[0]}"></div>`;
      proxyGroupElement += `    </div>`;
      proxyGroupElement += `  </div>`;
      proxyGroupElement += `  <div class="flex flex-col gap-2 mt-3 text-sm">`;
      const indexName = [
          `${reverse("NAJORT")} TLS`, `${reverse("SSELV")} TLS`, `${reverse("SS")} TLS`, `${reverse("SSEMV")} TLS`,
          `${reverse("NAJORT")} NTLS`, `${reverse("SSELV")} NTLS`, `${reverse("SS")} NTLS`, `${reverse("SSEMV")} NTLS`,
      ];
      for (let x = 0; x < proxyData.list.length; x++) {
        const proxy = proxyData.list[x];
        if (x % 2 == 0) {
          proxyGroupElement += `<div class="flex gap-2 justify-around w-full">`;
        }
        proxyGroupElement += `<button class="bg-blue-500 dark:bg-neutral-800 dark:border-2 dark:border-blue-500 rounded p-1 w-full text-white" onclick="copyToClipboard('${proxy}')">${indexName[x]}</button>`;
        if (x % 2 == 1 || x === proxyData.list.length - 1) {
          proxyGroupElement += `</div>`;
        }
      }
      proxyGroupElement += `  </div></div>`;
    }
    proxyGroupElement += `</div>`;
    this.html = this.html.replaceAll("PLACEHOLDER_PROXY_GROUP", `${proxyGroupElement}`);
  }
  buildCountryFlag() {
    const proxyBankUrl = this.url.searchParams.get("proxy-list");
    const flagList = [...new Set(cachedProxyList.map(p => p.country))];
    let flagElement = "";
    for (const flag of flagList) {
      flagElement += `<a href="/sub?cc=${flag}${proxyBankUrl ? "&proxy-list=" + proxyBankUrl : ""}" class="py-1" ><img width=20 src="https://hatscripts.github.io/circle-flags/flags/${flag.toLowerCase()}.svg" /></a>`;
    }
    this.html = this.html.replaceAll("PLACEHOLDER_BENDERA_NEGARA", flagElement);
  }
  addPageButton(text, link, isDisabled) {
    const pageButton = `<li><button ${isDisabled ? "disabled" : ""} class="px-3 py-1 bg-amber-400 border-2 border-neutral-800 rounded" onclick=navigateTo('${link}')>${text}</button></li>`;
    this.html = this.html.replaceAll("PLACEHOLDER_PAGE_BUTTON", `${pageButton}\nPLACEHOLDER_PAGE_BUTTON`);
  }
  build() {
    this.buildProxyGroup();
    this.buildCountryFlag();
    this.html = this.html.replaceAll("PLACEHOLDER_API_READY", isApiReady ? "block" : "hidden");
    return this.html.replaceAll(/PLACEHOLDER_\w+/gim, "");
  }
}
