const fs = require('fs');
const {Keystore, AccountTools, registerAccount} = require('vulcan-api-js');

(async () => {
  const keystore = new Keystore();
  await keystore.init();

  fs.writeFileSync("keystore.json", keystore.dumpToJsonString(), {encoding: 'utf-8'});

  const account = await registerAccount(keystore, "TOKEN", "powiatSYMBOL", "PIN2137");
  fs.writeFileSync("account.json", AccountTools.dumpToJsonString(account), {encoding: 'utf-8'});
})()

