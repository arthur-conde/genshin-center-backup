# genshin-center-backup

# Requirements
* A Pastebin account

# Configuration
1. Insert your developer key
2. Generate a user key
3. Insert your user key
4. Insert your folder key

# Generating a user key

```js
const formData = new FormData();
formData.append('api_dev_key', "Insert your dev key here");
formData.append('api_user_name', "Insert your Pastebin username here");
formData.append('api_user_name', "Insert your Pastebin password here");
const user_key = await fetch('https://pastebin.com/api/api_login.php', {
  method: 'POST',
  body: formData
});
```

# Finding your folder key
1. Navigate to the folder you want to store backups in.
2. Retrieve your folder key from the url
```
https://pastebin.com/u/{USER_NAME}/1/{FOLDER_KEY}
```
