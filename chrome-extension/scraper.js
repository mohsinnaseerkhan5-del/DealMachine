// scraper.js
(async () => {
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  // Grab the stored JWT from chrome.storage
  function getToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get("jwtToken", ({ jwtToken }) => resolve(jwtToken));
    });
  }

  // Fetch one page of leads from the DealMachine v2 API
  async function fetchLeadsPage(page, pageSize, token) {
    const res = await fetch("https://api.dealmachine.com/v2/leads/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        page,
        pageSize,
        // Add additional filters if needed
      }),
    });

    if (!res.ok) throw new Error(`DealMachine API error ${res.status}`);
    return await res.json(); // Expected: { data: [...], meta: { totalPages, totalCount, page, pageSize } }
  }

  // Process leads and extract only wireless numbers
  function processLeads(leads) {
    const rows = [];
    for (const lead of leads) {
      const { street, city, state, zip } = lead.address || {};
      const [first, ...rest] = (lead.ownerName || "").split(" ");
      const last = rest.pop() || "";
      const middle = rest.join(" ");

      for (const p of lead.phoneNumbers || []) {
        if ((p.type || "").toLowerCase() === "wireless") {
          rows.push([street || "", city || "", state || "", zip || "", p.number || "", first, middle, last]);
        }
      }
    }
    return rows;
  }

  try {
    const token = await getToken();
    if (!token) throw new Error("No JWT token found. Please log in first.");

    const pageSize = 200;
    let page = 1;
    let totalPages = 1;
    const allRows = [];

    // CSV header
    const header = ["Street", "City", "State", "Zip", "Phone", "First", "Middle", "Last"];
    allRows.push(header);

    while (page <= totalPages) {
      console.log(`⏳ Fetching API page ${page}/${totalPages}…`);
      const { data, meta } = await fetchLeadsPage(page, pageSize, token);
      totalPages = meta.totalPages || 1;

      const rows = processLeads(data || []);
      console.log(`   ↳ ${rows.length} wireless numbers on this page.`);
      allRows.push(...rows);

      page++;
      await delay(100);
    }

    // Build CSV
    const csvText = allRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");

    // Download CSV
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `dealmachine_wireless_${allRows.length - 1}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    console.log(`🎉 Done! Exported ${allRows.length - 1} wireless numbers.`);

    // Send log to Render backend
    try {
      await fetch("https://dealmachine.onrender.com/api/scraping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dataCount: allRows.length - 1,
          status: "completed",
        }),
      });
      console.log("✅ Scraping session logged to backend.");
    } catch (backendErr) {
      console.warn("⚠️ Failed to log session to backend:", backendErr);
    }

    // Dispatch event for popup or other listeners
    window.dispatchEvent(
      new CustomEvent("scraperComplete", { detail: { success: true, dataCount: allRows.length - 1 } })
    );

  } catch (err) {
    console.error("❌ Scraper error:", err);

    // Attempt to log failure to backend
    try {
      const token = await getToken();
      if (token) {
        await fetch("https://dealmachine.onrender.com/api/scraping", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            dataCount: 0,
            status: "failed",
          }),
        });
        console.log("⚠️ Failed session logged to backend.");
      }
    } catch (_) {
      console.warn("⚠️ Could not log failed session to backend.");
    }

    window.dispatchEvent(
      new CustomEvent("scraperComplete", { detail: { success: false, error: err.message, dataCount: 0 } })
    );
  }
})();
