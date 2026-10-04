import Link from "next/link";
import type { ReactNode } from "react";
import { CodeBlock, CodeTabs } from "@/components/client";
import { Callout } from "@/components/ui";
import { curlValidate, nodeValidate, onEnableJava, onEnableKotlin } from "@/lib/snippets";
import { STATUS_MESSAGES, type ValidationStatus } from "@/lib/types";

export interface GuideContext {
  baseUrl: string;
  pluginId: string;
}

export interface Guide {
  slug: string;
  title: string;
  summary: string;
  body: (ctx: GuideContext) => ReactNode;
}

const STATUS_HELP: Record<ValidationStatus, string> = {
  valid: "Everything is fine, the plugin starts.",
  invalid_format: "The key in license.txt has spaces or odd characters, or the plugin ID in the code is wrong.",
  not_found: "No license with that key exists for this plugin. Check for typos, or that the key belongs to this plugin.",
  expired: "The license's expiry date has passed. Extend it on the license page.",
  max_ips: "The key is already running on as many servers as allowed. Raise Max servers, or press Reset servers on the license page.",
  blacklisted: "The server's IP is on your blacklist.",
  disabled: "You (or a Tebex refund) disabled this license.",
  invalid_polymart: "Polymart didn't confirm the purchase. Check your Polymart API key and the resource link on the plugin.",
  rate_limited: "That server sent more than 60 checks in a minute. It works again a minute later.",
  server_error: "Something broke on your server. Check the site's console output.",
};

export const GUIDES: Guide[] = [
  {
    slug: "getting-started",
    title: "How it works",
    summary: "The 2-minute overview of plugins, licenses and checks.",
    body: () => (
      <>
        <p>Xkixos Licensing makes sure only people who bought your plugin can run it. There are three pieces:</p>
        <ol>
          <li>
            <strong>This website</strong> stores your plugins and license keys and answers &quot;is this key valid?&quot;.
          </li>
          <li>
            <strong>One Java class</strong> (<code>XkixosLicense.java</code>) that you copy into your plugin. When a server starts your plugin, it asks this website
            whether the key is valid. If not, the plugin turns itself off.
          </li>
          <li>
            <strong>License keys</strong>. You create them yourself, or BuiltByBit / Polymart / Tebex create them automatically when someone buys.
          </li>
        </ol>
        <h2>Setting up a plugin</h2>
        <ol>
          <li>
            Set your site address in <Link href="/dashboard/settings">Settings</Link>.
          </li>
          <li>
            Create the plugin on the <Link href="/dashboard/plugins">Plugins</Link> page. If you sell it on BuiltByBit, Polymart or Tebex, pick that under
            &quot;Sold on&quot;.
          </li>
          <li>Follow the 3 steps on the plugin&apos;s page: download the class, add one if-statement to onEnable, build.</li>
          <li>
            If you sell on a marketplace, set it up on the <Link href="/dashboard/integrations">Integrations</Link> page.
          </li>
        </ol>
        <h2>What you control per license</h2>
        <ul>
          <li>
            <strong>Max servers</strong>: how many different server IPs can run the plugin at once (0 = unlimited). Restarting a server never uses up a slot.
          </li>
          <li>
            <strong>Expiry date</strong>: after that date the key stops working. Leave it empty for lifetime.
          </li>
          <li>
            <strong>Enabled</strong>: turn a key off instantly, e.g. after a chargeback or a leak.
          </li>
          <li>
            <strong>Blacklist</strong>: block a server IP from using any of your licenses.
          </li>
        </ul>
        <h2>Why it can&apos;t be faked</h2>
        <p>
          Every answer from this site is signed with a private key that only your server has. The plugin checks the signature with the matching public key
          and sends a random one-time code (a nonce) with every request. So someone can&apos;t make a fake server that always says &quot;valid&quot;, or replay an
          old &quot;valid&quot; answer.
        </p>
        <Callout>
          The only way around it is to edit your plugin&apos;s code and remove the check. Obfuscating your jar makes that a lot harder, see{" "}
          <Link href="/dashboard/guides/plugin-setup">Adding the check to your plugin</Link>.
        </Callout>
      </>
    ),
  },
  {
    slug: "plugin-setup",
    title: "Adding the check to your plugin",
    summary: "Copy one class and one if-statement into your plugin.",
    body: ({ pluginId }) => (
      <>
        <p>
          The quickest way is the <strong>&quot;Add the license check&quot;</strong> box on each plugin&apos;s page, which has your plugin ID filled in. This guide
          explains the same steps in more detail.
        </p>
        <h2>1. Download the class</h2>
        <p>
          On the plugin&apos;s page, enter a package name (for example <code>me.you.myplugin.license</code>) and click <strong>Download XkixosLicense.java</strong>.
          Put the file in the matching folder, e.g. <code>src/main/java/me/you/myplugin/license/XkixosLicense.java</code>.
        </p>
        <p>
          The file already contains this site&apos;s address and public key. You don&apos;t need to add a Maven or Gradle dependency: it only uses Gson, which
          every Spigot, Paper and Folia server already includes, and it works on Java 8 and newer.
        </p>
        <Callout tone="warn">If you change your site address later, download the class again and rebuild, because the address is baked into it.</Callout>
        <h2>2. Call it in onEnable</h2>
        <p>Put this at the very start of onEnable, before you register commands or listeners:</p>
        <CodeTabs
          tabs={[
            { label: "Java", code: onEnableJava(pluginId) },
            { label: "Kotlin", code: onEnableKotlin(pluginId) },
          ]}
        />
        <p>
          <code>validateKey</code> returns <code>true</code> or <code>false</code> and prints the reason to the console itself. It also sends a small heartbeat
          every 30 seconds, so the dashboard can show how many servers are online.
        </p>
        <h2>3. What the buyer does</h2>
        <ol>
          <li>Puts your jar in the plugins folder and starts the server.</li>
          <li>
            The plugin creates <code>plugins/YourPlugin/license.txt</code> and turns itself off because the file is empty.
          </li>
          <li>They paste their key into that file and restart. Done.</li>
        </ol>
        <p>BuiltByBit and Polymart buyers skip this: their key is put into the jar automatically when they download it.</p>
        <h2>Testing</h2>
        <ol>
          <li>Create a license for yourself on the plugin&apos;s page.</li>
          <li>Start a test server with your plugin, paste the key into license.txt, restart.</li>
          <li>
            You should see <code>License is valid</code> in the console, and the check on the <Link href="/dashboard/checks">Check log</Link> page.
          </li>
          <li>Disable the license in the dashboard and restart the server: the plugin should now turn itself off.</li>
        </ol>
        <h2>Protecting the check</h2>
        <p>
          Anyone can decompile a normal jar and delete the if-statement. Running an obfuscator over your final jar makes that much harder. Popular free
          options are <strong>ProGuard</strong> and <strong>Skidfuscator</strong>. You can also call <code>validateKey</code> from more than one place, or store
          the result and check it again in important features.
        </p>
        <h2>Console messages</h2>
        <StatusTable />
      </>
    ),
  },
  {
    slug: "builtbybit",
    title: "Selling on BuiltByBit",
    summary: "Every download gets its own key baked into the jar.",
    body: ({ baseUrl }) => (
      <>
        <p>
          BuiltByBit has a feature called <strong>External license key</strong> placeholders. When a buyer downloads your resource, BuiltByBit asks this site for a
          key and writes it into the jar, replacing the text <code>%%__BBB_LICENSE__%%</code>. The license class already contains that text, so the buyer
          never has to paste a key.
        </p>
        <h2>Setup (one time)</h2>
        <ol>
          <li>
            Go to <Link href="/dashboard/integrations#builtbybit">Integrations → BuiltByBit</Link> and click <strong>Generate secret</strong>.
          </li>
          <li>
            Open{" "}
            <a href="https://builtbybit.com/placeholders/" target="_blank" rel="noreferrer">
              builtbybit.com/placeholders
            </a>{" "}
            and create a placeholder:
            <ul>
              <li>
                Placeholder: <code>%%__BBB_LICENSE__%%</code>
              </li>
              <li>
                Type: <code>External license key</code>
              </li>
              <li>
                URL: <code>{baseUrl}/api/builtbybit</code>
              </li>
              <li>Secret: the secret from step 1</li>
            </ul>
          </li>
        </ol>
        <h2>For each plugin</h2>
        <ol>
          <li>
            Create the plugin on the <Link href="/dashboard/plugins">Plugins</Link> page, choose <strong>BuiltByBit</strong> under &quot;Sold on&quot; and paste
            the resource link (e.g. <code>https://builtbybit.com/resources/my-plugin.12345/</code>).
          </li>
          <li>Add the license class to your plugin as normal, build it, and upload the jar as a new version on BuiltByBit.</li>
        </ol>
        <h2>How the keys work</h2>
        <ul>
          <li>The first time a buyer downloads, a new license is created with the plugin&apos;s default max servers and length.</li>
          <li>When they download again (e.g. an update), they get the same key, not a new one.</li>
          <li>The license shows up in your dashboard as &quot;BuiltByBit #userid&quot;. You can disable, extend or delete it like any other license.</li>
        </ul>
        <h2>Troubleshooting</h2>
        <ul>
          <li>
            The jar contains &quot;Unable to acquire a license key automatically&quot;: BuiltByBit couldn&apos;t reach this site, or got an error. Check the{" "}
            <Link href="/dashboard/integrations">Integration log</Link>. A common cause is the plugin not being linked to that exact resource ID.
          </li>
          <li>Wrong secret: generate a new one and paste it into the placeholder again.</li>
          <li>The site must be online on a public https address for BuiltByBit to reach it.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "polymart",
    title: "Selling on Polymart",
    summary: "Purchases are confirmed with Polymart the first time the plugin starts.",
    body: () => (
      <>
        <p>
          Polymart (now also called Voxel Shop) writes the buyer&apos;s Polymart license into every download using the placeholders <code>%%__POLYMART__%%</code>,{" "}
          <code>%%__LICENSE__%%</code> and <code>%%__USER__%%</code>. The license class already contains them.
        </p>
        <p>
          The first time a buyer&apos;s server starts the plugin, this site asks Polymart whether the license is real. If it is, a normal license is created
          (starting with <code>pm_</code>), and after that it works like any other key: you can see it, disable it, limit servers and so on.
        </p>
        <h2>Setup</h2>
        <ol>
          <li>
            Add your Polymart API key in <Link href="/dashboard/integrations#polymart">Integrations → Polymart</Link>.
          </li>
          <li>
            Create the plugin, choose <strong>Polymart</strong> under &quot;Sold on&quot; and paste the resource link.
          </li>
          <li>Add the license class to your plugin, build, and upload to Polymart.</li>
        </ol>
        <Callout tone="warn">
          Polymart&apos;s API docs were not publicly readable when this was built, so this follows their documented <code>verifyPurchase</code> flow. Test it
          once by buying or downloading your own resource. If a real purchase shows <code>invalid_polymart</code>, the{" "}
          <Link href="/dashboard/integrations">Integration log</Link> shows Polymart&apos;s exact reply.
        </Callout>
      </>
    ),
  },
  {
    slug: "tebex",
    title: "Selling on Tebex",
    summary: "Buyers are emailed their key when they pay.",
    body: ({ baseUrl }) => (
      <>
        <p>
          Tebex can&apos;t put a key into a jar, so instead it tells this site when someone pays. A license is created and emailed to the address the buyer used
          at checkout. If the payment is refunded or charged back, the license is disabled automatically.
        </p>
        <h2>Setup</h2>
        <ol>
          <li>
            Go to{" "}
            <a href="https://creator.tebex.io/webhooks" target="_blank" rel="noreferrer">
              creator.tebex.io/webhooks
            </a>{" "}
            and copy your webhook secret into <Link href="/dashboard/integrations#tebex">Integrations → Tebex</Link>. Save it.
          </li>
          <li>
            On the same Tebex page click <strong>Add endpoint</strong>, paste <code>{baseUrl}/api/tebex</code> and tick <code>payment.completed</code> (plus{" "}
            <code>payment.refunded</code> and <code>payment.dispute.opened</code> if you want auto-disabling).
          </li>
          <li>
            Fill in the email (SMTP) settings on the Integrations page and send yourself a test email. Gmail works with an{" "}
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">
              app password
            </a>
            : host <code>smtp.gmail.com</code>, port <code>587</code>.
          </li>
          <li>
            Create the plugin, choose <strong>Tebex</strong> under &quot;Sold on&quot; and enter the Tebex package ID.
          </li>
          <li>Ship the plugin with the license class as normal. Buyers paste the emailed key into license.txt.</li>
        </ol>
        <p>If someone buys a quantity of 3, they get 3 keys in one email. If Tebex sends the same webhook twice, no duplicate keys or emails are created.</p>
      </>
    ),
  },
  {
    slug: "statuses",
    title: "Check results explained",
    summary: "What each result in the check log means and how to fix it.",
    body: () => (
      <>
        <p>Every check gets one of these results. The plugin prints the message in the server console, so buyers will often send you this text.</p>
        <StatusTable />
      </>
    ),
  },
  {
    slug: "non-minecraft",
    title: "Other software (bots, apps)",
    summary: "Use the validation API from any language.",
    body: ({ baseUrl, pluginId }) => (
      <>
        <p>
          Anything that can make HTTP requests can use Xkixos Licensing, for example a Discord bot or a desktop app. Create a &quot;plugin&quot; for it in the
          dashboard like normal, then call the validation endpoint yourself.
        </p>
        <h2>The request</h2>
        <CodeBlock lang="HTTP" code={`GET ${baseUrl}/api/validate/{pluginId}/{licenseKey}?sessionId={uuid}&nonce={uuid}`} />
        <ul>
          <li>
            <code>sessionId</code>: a random UUID, the same for the whole time your program runs. It&apos;s used to count servers online.
          </li>
          <li>
            <code>nonce</code>: a new random UUID for every request. The answer contains the same nonce, signed, so an old answer can&apos;t be replayed.
          </li>
        </ul>
        <CodeBlock lang="Shell" code={curlValidate(baseUrl, pluginId)} />
        <h2>The answer</h2>
        <CodeBlock
          lang="JSON"
          code={`{
  "pluginId": "${pluginId}",
  "key": "LICENSE-KEY",
  "status": "valid",
  "message": "License is valid",
  "nonce": "the nonce you sent",
  "signature": "base64 RSA-SHA256 signature"
}`}
        />
        <p>
          The signature covers the text <code>xkl1|pluginId|key|status|nonce</code> (joined with <code>|</code>). Verify it with the public key from{" "}
          <Link href="/dashboard/settings">Settings</Link>. If your program runs on a computer you control (like your own bot&apos;s server), you can skip the
          signature check.
        </p>
        <h2>Node.js example</h2>
        <CodeBlock lang="JavaScript" code={nodeValidate(baseUrl, pluginId)} />
        <h2>Heartbeat (optional)</h2>
        <p>
          Send <code>POST {baseUrl}/api/heartbeat/{"{pluginId}"}/{"{key}"}</code> with <code>{`{"sessionId": "..."}`}</code> every 30 seconds to keep the
          server counted as online. Send <code>{`{"sessionId": "...", "shutdown": true}`}</code> when your program stops to free its slot straight away.
        </p>
        <h2>Results</h2>
        <StatusTable />
      </>
    ),
  },
  {
    slug: "rest-api",
    title: "REST API",
    summary: "Manage plugins, licenses and the blacklist from code.",
    body: ({ baseUrl, pluginId }) => (
      <>
        <p>
          Create a key on the <Link href="/dashboard/api-keys">API keys</Link> page and send it in the <code>X-API-Key</code> header (or as{" "}
          <code>Authorization: Bearer xkl_...</code>). All bodies are JSON.
        </p>
        <h2>Endpoints</h2>
        <div className="my-3 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-line">
              {[
                ["GET", "/api/v1/plugins", "List plugins"],
                ["POST", "/api/v1/plugins", "Create a plugin"],
                ["GET", "/api/v1/plugins/{pluginId}", "Get a plugin"],
                ["PATCH", "/api/v1/plugins/{pluginId}", "Update a plugin"],
                ["DELETE", "/api/v1/plugins/{pluginId}", "Delete a plugin and its licenses"],
                ["GET", "/api/v1/plugins/{pluginId}/licenses", "List licenses (?q=search&limit=&offset=)"],
                ["POST", "/api/v1/plugins/{pluginId}/licenses", "Create a license"],
                ["GET", "/api/v1/licenses/{key}", "Get a license"],
                ["PATCH", "/api/v1/licenses/{key}", "Update a license"],
                ["DELETE", "/api/v1/licenses/{key}", "Delete a license"],
                ["GET", "/api/v1/blacklist", "List blocked IPs"],
                ["POST", "/api/v1/blacklist", "Block an IP"],
                ["GET", "/api/v1/blacklist/{id}", "Get a blacklist entry"],
                ["PATCH", "/api/v1/blacklist/{id}", "Update a blacklist entry"],
                ["DELETE", "/api/v1/blacklist/{id}", "Unblock an IP"],
              ].map(([m, p, d]) => (
                <tr key={m + p}>
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-accent-2">{m}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p}</td>
                  <td className="px-3 py-2 text-muted">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2>Create a license</h2>
        <CodeBlock
          lang="Shell"
          code={`curl -X POST "${baseUrl}/api/v1/plugins/${pluginId}/licenses" \\
  -H "X-API-Key: xkl_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"user": "Steve", "maxIps": 2, "expiresOn": "2027-01-01"}'`}
        />
        <p>
          All fields are optional: <code>key</code> (custom key, otherwise random), <code>user</code>, <code>note</code>, <code>maxIps</code> (0 = unlimited),{" "}
          <code>expiresOn</code> (a date, or <code>&quot;Never&quot;</code>), <code>enabled</code>. Missing values use the plugin&apos;s defaults.
        </p>
        <h2>License object</h2>
        <CodeBlock
          lang="JSON"
          code={`{
  "key": "5b0c8f7e-6a52-4b8e-9d3f-2f6f4a7c1e90",
  "pluginId": "${pluginId}",
  "user": "Steve",
  "note": null,
  "maxIps": 2,
  "expiresOn": "2027-01-01T23:59:59.000Z",
  "enabled": true,
  "source": "api",
  "activeServers": 0,
  "lastValidatedAt": null,
  "createdAt": "2026-10-04T12:00:00.000Z"
}`}
        />
        <h2>Create a plugin</h2>
        <CodeBlock
          lang="Shell"
          code={`curl -X POST "${baseUrl}/api/v1/plugins" \\
  -H "X-API-Key: xkl_your_key" -H "Content-Type: application/json" \\
  -d '{"name": "SuperSpawners", "marketplace": {"type": "builtbybit", "url": "https://builtbybit.com/resources/superspawners.12345/"}, "defaultMaxIps": 1}'`}
        />
        <h2>Block an IP</h2>
        <CodeBlock
          lang="Shell"
          code={`curl -X POST "${baseUrl}/api/v1/blacklist" \\
  -H "X-API-Key: xkl_your_key" -H "Content-Type: application/json" \\
  -d '{"ip": "203.0.113.7", "reason": "Leaked the plugin"}'`}
        />
        <p>
          Errors come back as <code>{`{"error": "message"}`}</code> with status 400, 401 or 404.
        </p>
      </>
    ),
  },
];

function StatusTable() {
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2 font-medium">Result</th>
            <th className="px-3 py-2 font-medium">Console message</th>
            <th className="px-3 py-2 font-medium">What to do</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {(Object.keys(STATUS_MESSAGES) as ValidationStatus[]).map((s) => (
            <tr key={s}>
              <td className="px-3 py-2 font-mono text-xs">{s}</td>
              <td className="px-3 py-2">{STATUS_MESSAGES[s]}</td>
              <td className="px-3 py-2 text-muted">{STATUS_HELP[s]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
