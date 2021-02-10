// ==UserScript==
// @name     Genshin-Center Backup Script
// @version  0.0.1
// @grant    GM.registerMenuCommand
// @grant    GM.addStyle
// @grant    GM_addStyle
// @grant    GM.getResourceUrl
// @include  https://genshin-center.com/planner
// @require  https://cdn.jsdelivr.net/npm/noty@3.2.0-beta/lib/noty.min.js
// @require  https://cdn.jsdelivr.net/npm/luxon@1.25.0/build/global/luxon.min.js
// @require  https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @require  https://code.jquery.com/jquery-3.5.1.min.js
// @require  https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js
// @resource bootstrap_CSS https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css
// @resource noty_CSS https://cdn.jsdelivr.net/npm/noty@3.2.0-beta/lib/noty.css
// @resource noty_bootstrapv4_CSS https://cdn.jsdelivr.net/npm/noty@3.2.0-beta/lib/themes/bootstrap-v4.css
// ==/UserScript==


function Main() {
  const API_KEY = "";
  const API_USER_KEY = "";
  const PASTEBIN_FOLDER_KEY = '';
  const ENDPOINT = {
    LOGIN: `https://pastebin.com/api/api_login.php`,
    PASTE: `https://pastebin.com/api/api_post.php`,
    RAW: `https://pastebin.com/api/api_raw.php`,
  };
  
  const parser = new DOMParser();
  
  const ERROR_QUEUE = 'noty_errors';
  const INFO_QUEUE = 'noty_info';
  
  Noty.overrideDefaults({
    theme: 'bootstrap-v4',
  });

  async function BackupToPastebin() {
    try {
      const now = luxon.DateTime.local();
      const pasteName = `Genshin Center Backup ${now.toLocaleString(luxon.DateTime.DATETIME_FULL_WITH_SECONDS)}`;
      console.log(`Unique ID: ${pasteName}`);

      const plan = JSON.parse(localStorage.data);
      const inventoryData = JSON.parse(localStorage.inventory);
      const backupObject = {
        plan,
        inventory: inventoryData
      };

      const backupData = JSON.stringify(backupObject, null, '  ');
      const pasteUrl = await CreatePaste(pasteName, backupData);
      if (!pasteUrl) {
        const errorMessage = new Noty({
          type: 'error',
          text: 'Unable to POST to Pastebin API.',
          layout: 'topCenter',
          timeout: 2000,
          queue: ERROR_QUEUE,
        });
        errorMessage.show();
        return;
      }
      const message = new Noty({
        type: 'success',
        text: `Your data has been backed up to <a href="${pasteUrl}" target="_blank">Pastebin</a>!<br/>`,
        layout: 'topCenter',
        timeout: false,
        queue: INFO_QUEUE,
        closeWith: 'button',
        buttons: [
          Noty.button('OK', 'btn btn-success', function() {
            message.close();
          }),
        ]
      });
      message.show();
      return;
      
    } catch (error) {
      console.error(`An error occurred trying to back up to Pastebin`, error);
    }
  }
  
  const Util = {
    Error(message, killer = false) {
      new Noty({
        type: 'error',
        text: message,
        layout: 'topCenter',
        timeout: 2000,
        killer,
        queue: ERROR_QUEUE,
      }).show();
    }
  };
  
  function Info(message, killer = false) {
    new Noty({
      type: 'info',
      text: message,
      layout: 'topCenter',
      timeout: 2000,
      killer,
      queue: INFO_QUEUE,
    }).show();
  }
  
  async function RestoreFromPastebin() {
    try {
     	Info(`Getting backups...`);
      const pastes = await ListBackups();
      const message = new Noty({
        type: 'info',
        text: `Select a backup to restore`,
        layout: 'topCenter',
        timeout: false,
        killer: true,
        queue: INFO_QUEUE,
        closeWith: 'button',
        buttons: [
          ...pastes.filter(v => v.title.startsWith("Genshin Center Backup")).map(v => Noty.button(v.title, 'btn btn-success', () => {
        		message.close();
            RestoreBackup(v);
          })),
          Noty.button('Cancel', 'btn btn-danger', function() {
            message.close();
          }),
        ]
      });
      message.show();
      
      
    } catch (error) {
      new Noty({
        type: 'error',
        text: 'An error occurred trying to restore from Pastebin.',
        layout: 'topCenter',
        timeout: 2000,
        queue: ERROR_QUEUE,
      });
      console.error(`An error occurred trying to restore`, error);
    }
  }

  
  async function CreatePaste(caption, data) {
    try {
      const formData = new FormData();
      formData.append('api_dev_key', API_KEY);
      formData.append('api_option', 'paste');
      formData.append('api_paste_code', data);
      formData.append('api_user_key', API_USER_KEY);
      formData.append('api_paste_name', caption);
      formData.append('api_paste_format', 'json');
      formData.append('api_paste_private', '2');
      formData.append('api_paste_expire_date', 'N');
      formData.append('api_folder_key', PASTEBIN_FOLDER_KEY);

      const response = await fetch(ENDPOINT.PASTE, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        return await response.text();
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Failed to paste`, error);
      return null;
    }
  }
  
  async function ListBackups() {
    const backups = [];
    try {
      const formData = new FormData();
      formData.append('api_dev_key', API_KEY);
      formData.append('api_user_key', API_USER_KEY);
      formData.append('api_option', 'list');

      const response = await fetch(ENDPOINT.PASTE, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const xml = await response.text();
        const xmlDom = parser.parseFromString(`<root>${xml}</root>`, 'text/xml');
        xmlDom.querySelectorAll('paste').forEach(($paste, $i) => {
          const paste = {};
          for(let i = 0; i < $paste.children.length;i++) {
            const $child = $paste.children.item(i);
            if ($child) {
              const propertyName = $child.nodeName.replace(/^paste_/,'');
              const value = $child.textContent;
              paste[propertyName] = value;
            }
          }
          backups.push(paste);
        });
      }
      return backups;
    } catch (error) {
      console.error(`Failed to retrieve a user key`, error);
      return backups;
    }
  }
  
  async function DownloadPaste(key) {
    try {
      const formData = new FormData();
      formData.append('api_dev_key', API_KEY);
      formData.append('api_user_key', API_USER_KEY);
      formData.append('api_option', 'show_paste');
      formData.append('api_paste_key', key);

      const response = await fetch(ENDPOINT.RAW, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        return await response.text();
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Failed to paste`, error);
      return null;
    }
  }
  
  async function RestoreBackup(paste) {
    Info(`Downloading backup...`);
    const json = await DownloadPaste(paste.key);
    Info(`Download complete!`);
    const backup = JSON.parse(json);
    const { plan: data, inventory } = backup;
    if (!data || !inventory) {
      Util.Error(`Backup selected is not in the correct structure. It is invalid.`);
      return;
    }
    localStorage.data = JSON.stringify(data);
    localStorage.inventory = JSON.stringify(inventory);
    
    const message = new Noty({
      type: 'success',
      text: `Backup restored. You need to refresh the page.`,
      layout: 'topCenter',
      timeout: false,
      killer: true,
      queue: INFO_QUEUE,
      closeWith: 'button',
      buttons: [
        Noty.button('Refresh', 'btn btn-success', function() {
          message.close();
          location.reload();
        }),
        Noty.button('Cancel', 'btn btn-danger', function() {
          message.close();
        }),
      ]
    });
    message.show();
  }

  GM.registerMenuCommand('Backup', BackupToPastebin, 'b');
  GM.registerMenuCommand('Restore', RestoreFromPastebin, 'r');
}

async function Setup() {
  const cssToAdd = [
    await GM.getResourceUrl("noty_CSS"),
    await GM.getResourceUrl("bootstrap_CSS"),
    await GM.getResourceUrl("noty_bootstrapv4_CSS"),
  ];
 
    
  let head = document.getElementsByTagName('head')[0];
  if (head) {
    cssToAdd.forEach((uri) => {
    	let linkElement = document.createElement('link');
      linkElement.setAttribute('rel', 'stylesheet');
      linkElement.setAttribute('href', uri);
      head.prepend(linkElement);  
    });
  }
}


(async function() {
  try {
    await Setup();
    Main();
  } catch (error) {
    console.error(`Oops! Something went wrong.`, error);
  }
})();
