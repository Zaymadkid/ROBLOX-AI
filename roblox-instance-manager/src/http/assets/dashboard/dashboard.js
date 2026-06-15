/* ── State ────────────────────────────────── */
let selectedClientId = null;
let currentView = 'clients';
let dashboardMode = 'home'; // 'home' or 'client'
let clients = [];
let toolCallCount = 0;
let currentRelays = 0;
let currentConnected = false;
let settingsProvider = 'openai';

let startTime = Date.now();

/* ── DOM refs ──────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const topbarSection = ('topbarSection');
const topbarStatus = $('topbarStatus');
const topbarRole = $('topbarRole');
const clientSelectorBtn = $('clientSelectorBtn');
const clientSelectorAvatar = $('clientSelectorAvatar');
const clientSelectorName = $('clientSelectorName');
const clientDropdown = $('clientDropdown');
const clientDropdownSearch = $('clientDropdownSearch');
const clientDropdownList = $('clientDropdownList');
const uptimeChip = $('uptimeChip');

const viewClients = $('viewClients');
const viewOverview = $('viewOverview');
const viewTools = $('viewTools');
const viewServer = $('viewServer');
const viewSettings = $('viewSettings');
const viewServerLogs = $('viewServerLogs');
const viewScripts = $('viewScripts');
const topbarBack = $('topbarBack');
const sidebarNavHome = $('sidebarNavHome');
const sidebarNavClient = $('sidebarNavClient');

const noClientSearch = $('noClientSearch');
const noClientList = $('noClientList');