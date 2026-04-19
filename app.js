const STORAGE_KEY = 'monomikke_items_v1';
const DEFAULT_IMAGE = '';

const itemForm = document.getElementById('itemForm');
const photoInput = document.getElementById('photo');
const photoPreview = document.getElementById('photoPreview');
const itemList = document.getElementById('itemList');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const stats = document.getElementById('stats');
const resetDemoBtn = document.getElementById('resetDemoBtn');

const chatDialog = document.getElementById('chatDialog');
const closeChatBtn = document.getElementById('closeChatBtn');
const chatTitle = document.getElementById('chatTitle');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const roleButtons = document.querySelectorAll('.role-btn');
const itemCardTemplate = document.getElementById('itemCardTemplate');

let currentPhotoData = DEFAULT_IMAGE;
let currentChatItemId = null;
let currentRole = 'owner';

const demoItems = [
  {
    id: crypto.randomUUID(),
    name: '青い筆箱',
    features: '表に星のシール。少し角がへこんでいます。',
    finder: '田中さん',
    location: '2年A組の前の廊下',
    foundAt: '2026-04-18T15:40',
    photo: '',
    chats: [
      {
        id: crypto.randomUUID(),
        senderRole: 'finder',
        text: '職員室前で預かっています。放課後に受け渡しできます。',
        sentAt: new Date().toISOString()
      }
    ]
  },
  {
    id: crypto.randomUUID(),
    name: '白い水筒',
    features: 'ふたに青いライン。側面に小さい傷あり。',
    finder: '図書委員',
    location: '図書室の机',
    foundAt: '2026-04-19T10:15',
    photo: '',
    chats: []
  }
];

function loadItems() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    saveItems(demoItems);
    return structuredClone(demoItems);
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('データ読み込みエラー:', error);
    saveItems(demoItems);
    return structuredClone(demoItems);
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function formatDateTime(value) {
  if (!value) return '時刻未登録';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildSearchText(item) {
  return normalizeText([
    item.name,
    item.features,
    item.finder,
    item.location,
    item.foundAt,
    formatDateTime(item.foundAt)
  ].join(' '));
}

function getItems() {
  return loadItems().sort((a, b) => new Date(b.foundAt) - new Date(a.foundAt));
}

function renderItems() {
  const items = getItems();
  const rawQuery = normalizeText(searchInput.value);
  const queries = rawQuery.split(' ').filter(Boolean);

  const filtered = items.filter((item) => {
    if (queries.length === 0) return true;
    const haystack = buildSearchText(item);
    return queries.every((query) => haystack.includes(query));
  });

  stats.textContent = `${filtered.length}件 / 全${items.length}件`;
  itemList.innerHTML = '';

  if (filtered.length === 0) {
    itemList.innerHTML = '<div class="empty-state">一致する落とし物が見つかりませんでした。</div>';
    return;
  }

  filtered.forEach((item) => {
    const fragment = itemCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.item-card');
    const img = fragment.querySelector('.item-image');
    const fallback = fragment.querySelector('.image-fallback');

    fragment.querySelector('.item-name').textContent = item.name;
    fragment.querySelector('.item-time').textContent = formatDateTime(item.foundAt);
    fragment.querySelector('.item-features').textContent = item.features;
    fragment.querySelector('.item-finder').textContent = item.finder;
    fragment.querySelector('.item-location').textContent = item.location;

    if (item.photo) {
      img.src = item.photo;
      img.hidden = false;
      fallback.hidden = true;
    } else {
      img.hidden = true;
      fallback.hidden = false;
    }

    fragment.querySelector('.chat-open-btn').addEventListener('click', () => openChat(item.id));
    fragment.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id));

    card.dataset.id = item.id;
    itemList.appendChild(fragment);
  });
}

function resetForm() {
  itemForm.reset();
  currentPhotoData = DEFAULT_IMAGE;
  photoPreview.hidden = true;
  photoPreview.src = '';
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

photoInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    currentPhotoData = DEFAULT_IMAGE;
    photoPreview.hidden = true;
    return;
  }

  try {
    currentPhotoData = await readFileAsDataURL(file);
    photoPreview.src = currentPhotoData;
    photoPreview.hidden = false;
  } catch (error) {
    alert('画像の読み込みに失敗しました。');
    console.error(error);
  }
});

itemForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const items = getItems();
  const newItem = {
    id: crypto.randomUUID(),
    name: document.getElementById('name').value.trim(),
    features: document.getElementById('features').value.trim(),
    finder: document.getElementById('finder').value.trim(),
    location: document.getElementById('location').value.trim(),
    foundAt: document.getElementById('foundAt').value,
    photo: currentPhotoData,
    chats: [
      {
        id: crypto.randomUUID(),
        senderRole: 'finder',
        text: '見つけたものを登録しました。心当たりがあれば連絡してください。',
        sentAt: new Date().toISOString()
      }
    ]
  };

  items.push(newItem);
  saveItems(items);
  resetForm();
  renderItems();
  alert('落とし物を登録しました。');
});

function deleteItem(itemId) {
  const ok = confirm('この落とし物情報を削除しますか？');
  if (!ok) return;

  const nextItems = getItems().filter((item) => item.id !== itemId);
  saveItems(nextItems);
  renderItems();

  if (currentChatItemId === itemId) {
    chatDialog.close();
    currentChatItemId = null;
  }
}

function openChat(itemId) {
  currentChatItemId = itemId;
  const item = getItems().find((entry) => entry.id === itemId);
  if (!item) return;

  chatTitle.textContent = `${item.name} の受け取り相談`;
  renderChatMessages(item);
  chatDialog.showModal();
}

function renderChatMessages(item) {
  chatMessages.innerHTML = '';

  if (!item.chats || item.chats.length === 0) {
    chatMessages.innerHTML = '<div class="empty-state">まだメッセージはありません。</div>';
    return;
  }

  item.chats.forEach((message) => {
    const div = document.createElement('div');
    div.className = `message ${message.senderRole}`;
    div.innerHTML = `
      <span class="message-meta">${message.senderRole === 'owner' ? '落とし主' : '発見者'} ・ ${formatDateTime(message.sentAt)}</span>
      <div>${escapeHtml(message.text).replace(/\n/g, '<br>')}</div>
    `;
    chatMessages.appendChild(div);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!currentChatItemId) return;

  const messageText = chatInput.value.trim();
  if (!messageText) return;

  const items = getItems();
  const item = items.find((entry) => entry.id === currentChatItemId);
  if (!item) return;

  if (!Array.isArray(item.chats)) item.chats = [];
  item.chats.push({
    id: crypto.randomUUID(),
    senderRole: currentRole,
    text: messageText,
    sentAt: new Date().toISOString()
  });

  saveItems(items);
  chatInput.value = '';
  renderChatMessages(item);
});

roleButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentRole = button.dataset.role;
    roleButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
  });
});

closeChatBtn.addEventListener('click', () => chatDialog.close());
chatDialog.addEventListener('click', (event) => {
  const rect = chatDialog.getBoundingClientRect();
  const clickedInDialog = (
    rect.top <= event.clientY &&
    event.clientY <= rect.top + rect.height &&
    rect.left <= event.clientX &&
    event.clientX <= rect.left + rect.width
  );
  if (!clickedInDialog) chatDialog.close();
});

searchInput.addEventListener('input', renderItems);
clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  renderItems();
});

resetDemoBtn.addEventListener('click', () => {
  const ok = confirm('現在の保存データを消して、デモデータを入れ直しますか？');
  if (!ok) return;
  saveItems(structuredClone(demoItems));
  renderItems();
});

renderItems();
