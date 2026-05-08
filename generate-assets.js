/**
 * generate-assets.js — 批量生成游戏美术资产
 *
 * 用法:
 *   API_KEY=sk-xxxx node generate-assets.js
 *   API_KEY=sk-xxxx node generate-assets.js cover     # 只生成封面
 *   API_KEY=sk-xxxx node generate-assets.js portraits # 只生成肖像
 *   API_KEY=sk-xxxx node generate-assets.js weapons   # 只生成武器图标
 *   API_KEY=sk-xxxx node generate-assets.js all       # 全部
 */

var https = require("https");
var http = require("http");
var fs = require("fs");
var path = require("path");

var API_URL = "https://api.zwenooo.link/v1/images/generations";
var API_KEY = process.env.API_KEY || "";

if (!API_KEY) {
  console.error("ERROR: Set API_KEY env var. Example:");
  console.error("  API_KEY=sk-xxxx node generate-assets.js");
  process.exit(1);
}

// Parse URL for http/https module
var urlObj = new URL(API_URL);

// ---- Asset definitions ----
var ASSETS = {
  cover: [
    {
      id: "cover_main",
      file: "assets/concept/cover_main.png",
      size: "1024x1536",
      prompt: "Chinese dark fantasy game cover art, a lone night exorcist standing centered on xuan paper texture, wearing a conical straw hat and layered black ritual robes, holding a ritual sword in one hand and a glowing paper lantern in the other, cinnabar red seals and black ink smoke swirling behind him, an ancient temple silhouette and a huge red moon in the background, eerie but elegant, folk horror atmosphere, strong vertical composition, dramatic contrast, painterly ink-wash style, hand-painted texture, muted beige paper background, black ink, cinnabar red accents, subtle gold details, refined indie game key art, high detail, cinematic lighting, large clean empty space near the top for title, no text"
    },
    {
      id: "cover_symmetry",
      file: "assets/concept/cover_symmetry.png",
      size: "1024x1536",
      prompt: "A full-body Chinese exorcist centered on aged paper texture, front-facing, wearing a wide woven hat that hides the eyes, black ritual robe with torn edges, holding a curved sword and a lantern, ink splashes and talisman marks floating behind him, soft symmetrical composition, elegant and mysterious, muted beige background, black ink and cinnabar red palette, vertical cover art, high detail, no text, no border"
    },
    {
      id: "cover_temple",
      file: "assets/concept/cover_temple_pressure.png",
      size: "1024x1536",
      prompt: "Chinese dark fantasy cover art, a small lone exorcist standing at the center of a ruined temple gate, huge dark ink demon presence looming in the mist behind him, smoke and torn talismans filling the sides, xuan paper texture, black ink drips, cinnabar seals, dramatic vertical composition, strong negative space on top, eerie majestic atmosphere, painterly ink-wash style, no text"
    }
  ],
  portraits: [
    {
      id: "portrait-mojiangjun",
      file: "assets/portraits/portrait-mojiangjun.png",
      size: "1024x1024",
      prompt: "Chinese dark fantasy game character portrait, a demonic general made of black ink and cinnabar red, wearing ornate ancient Chinese armor made of calligraphy strokes, glowing red eyes, ink dripping from his form, fierce and imposing expression, xuan paper background, ink-wash painting style, transparent background, no text, no border, centered composition, high detail"
    },
    {
      id: "portrait-boss",
      file: "assets/portraits/portrait-boss.png",
      size: "1024x1024",
      prompt: "Chinese dark fantasy game character portrait, a shapeshifting demon lady with pale skin and flowing ink-black hair, wearing a beautiful but eerie traditional Chinese dress, half her face is cracked revealing dark ink underneath, subtle cinnabar red accents, ghostly elegant atmosphere, xuan paper background, ink-wash painting style, transparent background, no text, no border, centered composition, high detail"
    }
  ],
  weapons: [
    {
      id: "weapon-jian",
      file: "assets/ui/ui-weapon-jian-48.png",
      size: "1024x1024",
      prompt: "Chinese ritual sword icon for game UI, straight double-edged jian sword with simple guard, ink wash painting style, black ink on transparent background, cinnabar red tassel, simple clean design, game icon, no text, no background, centered, high detail"
    },
    {
      id: "weapon-bi",
      file: "assets/ui/ui-weapon-bi-48.png",
      size: "1024x1024",
      prompt: "Chinese calligraphy brush icon for game UI, a traditional ink brush with bamboo handle and wolf-hair tip, ink drops splattering from the tip, ink wash painting style, black ink on transparent background, simple clean design, game icon, no text, no background, centered, high detail"
    },
    {
      id: "weapon-ling",
      file: "assets/ui/ui-weapon-ling-48.png",
      size: "1024x1024",
      prompt: "Chinese bronze bell icon for game UI, a traditional hand bell with ancient patterns, rope handle, slight patina, ink wash painting style, black ink with cinnabar red cord on transparent background, simple clean design, game icon, no text, no background, centered, high detail"
    },
    {
      id: "weapon-san",
      file: "assets/ui/ui-weapon-san-48.png",
      size: "1024x1024",
      prompt: "Chinese oil-paper umbrella icon for game UI, a traditional bamboo umbrella with dark ink patterns on paper, ink wash painting style, black ink on transparent background, simple clean design, game icon, no text, no background, centered, high detail"
    }
  ]
};

// Negative prompt shared across all assets
var NEGATIVE = "modern city, cyberpunk, sci-fi, anime school uniform, cute mascot, chibi, plastic texture, glossy 3D, photorealistic face, western medieval armor, neon colors, clean vector icon, UI mockup, text, watermark, logo, low quality, blurry, extra limbs, white background";

// ---- API call ----
function generateImage(prompt, size) {
  return new Promise(function(resolve, reject) {
    var body = JSON.stringify({
      model: "gpt-image-2",
      prompt: prompt,
      size: size || "1024x1024",
      quality: "auto",
      output_format: "png",
      moderation: "auto"
    });

    var options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Authorization": "Bearer " + API_KEY,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    };

    var req = https.request(options, function(res) {
      var chunks = [];
      res.on("data", function(c) { chunks.push(c) });
      res.on("end", function() {
        var raw = Buffer.concat(chunks).toString();
        try {
          var json = JSON.parse(raw);
          if (json.error) {
            reject(new Error("API error: " + (json.error.message || JSON.stringify(json.error))));
            return;
          }
          if (!json.data || !json.data[0] || !json.data[0].b64_json) {
            reject(new Error("No image data in response: " + raw.substring(0, 200)));
            return;
          }
          resolve(json.data[0].b64_json);
        } catch(e) {
          reject(new Error("Parse error: " + raw.substring(0, 200)));
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ---- Main ----
async function run() {
  var filter = process.argv[2] || "all";
  var groups;

  if (filter === "all") {
    groups = Object.keys(ASSETS);
  } else if (ASSETS[filter]) {
    groups = [filter];
  } else {
    console.error("Unknown group: " + filter);
    console.error("Options: all, cover, portraits, weapons");
    process.exit(1);
  }

  var tasks = [];
  for (var gi = 0; gi < groups.length; gi++) {
    var group = ASSETS[groups[gi]];
    for (var ai = 0; ai < group.length; ai++) {
      tasks.push(group[ai]);
    }
  }

  console.log("Will generate " + tasks.length + " assets:");
  tasks.forEach(function(t) { console.log("  - " + t.id + " → " + t.file) });
  console.log("");

  var succeeded = 0, failed = 0;

  for (var i = 0; i < tasks.length; i++) {
    var task = tasks[i];
    console.log("[" + (i+1) + "/" + tasks.length + "] Generating " + task.id + "...");

    // Ensure directory exists
    var dir = path.dirname(task.file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Skip if file already exists
    if (fs.existsSync(task.file)) {
      console.log("  Already exists, skipping. Delete file to regenerate.");
      succeeded++;
      continue;
    }

    try {
      var fullPrompt = task.prompt + "\nNegative prompt: " + NEGATIVE;
      var b64 = await generateImage(fullPrompt, task.size);
      var buf = Buffer.from(b64, "base64");
      fs.writeFileSync(task.file, buf);
      var kb = Math.round(buf.length / 1024);
      console.log("  Saved " + task.file + " (" + kb + " KB)");
      succeeded++;
    } catch(e) {
      console.error("  FAILED: " + e.message);
      failed++;
    }

    // Rate limit: wait 2s between requests
    if (i < tasks.length - 1) {
      await new Promise(function(r) { setTimeout(r, 2000) });
    }
  }

  console.log("\nDone. " + succeeded + " succeeded, " + failed + " failed.");
  if (failed > 0) console.log("Re-run to retry failed assets (existing files are skipped).");
}

run().catch(function(e) {
  console.error("Fatal: " + e.message);
  process.exit(1);
});
