// popup.js
const STORAGE_KEY = "blacklist";

const form = document.getElementById("add-form");
const input = document.getElementById("site-input");
const tagList = document.getElementById("tag-list");
const emptyState = document.getElementById("empty-state");

function normalizeDomain(raw) {
  let value = raw.trim().toLowerCase();
  if (!value) return null;

  value = value.replace(/^[a-z]+:\/\//, "");
  value = value.split("/")[0].split("?")[0].split("#")[0].split(":")[0];
  value = value.replace(/^www\./, "");

  if (!value) return null;
  if (!value.includes(".")) value += ".com";

  return value;
}

async function getBlacklist() {
  const data = await chrome.storage.sync.get({ [STORAGE_KEY]: [] });
  return data[STORAGE_KEY];
}

async function setBlacklist(list) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: list });
}

function render(list) {
  tagList.innerHTML = "";
  emptyState.style.display = list.length ? "none" : "block";

  for (const domain of list) {
    const tag = document.createElement("div");
    tag.className = "tag";

    const label = document.createElement("span");
    label.textContent = domain;
    label.title = domain;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "\u2715"; // ✕
    removeBtn.setAttribute("aria-label", `Remove ${domain} from blacklist`);
    removeBtn.addEventListener("click", () => removeDomain(domain));

    tag.appendChild(label);
    tag.appendChild(removeBtn);
    tagList.appendChild(tag);
  }
}

async function refresh() {
  const list = await getBlacklist();
  render(list);
}

async function addDomain(raw) {
  const domain = normalizeDomain(raw);
  if (!domain) return;

  const list = await getBlacklist();
  if (list.includes(domain)) return;

  list.push(domain);
  await setBlacklist(list);
  render(list);
}

async function removeDomain(domain) {
  const list = await getBlacklist();
  const next = list.filter((d) => d !== domain);
  await setBlacklist(next);
  render(next);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = input.value;
  input.value = "";
  addDomain(value);
});

document.addEventListener("DOMContentLoaded", refresh);
