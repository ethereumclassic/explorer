const Web3 = require('web3');

const ABI = require('../abi/bios');
const { getConfig } = require('../utils');
const config = getConfig();

require('../db.js');
const mongoose = require('mongoose');

const Authority = mongoose.model('Authority');
const AuthoritySlot = mongoose.model('AuthoritySlot');
const Poll = mongoose.model('Poll');

const SYNC_TIMEOUT = 3000;

console.log(`Connecting ${config.nodeAddr}:${config.wsPort}...`);
const web3 = new Web3(
  new Web3.providers.WebsocketProvider(
    `ws://${config.nodeAddr}:${config.wsPort}`
  )
);
if (web3.eth.net.isListening()) console.log('Web3 connection established');
const contract = new web3.eth.Contract(ABI, config.biosAddress);

const callMethod = (method, ...args) =>
  contract.methods[method](...args).call();

const getAuthorities = async () => {
  const authorities = await callMethod('getAuthorities');
  const data = await Promise.all(
    authorities.map(address => callMethod('getAuthorityState', address))
  );
  return authorities.map((address, index) => ({
    address,
    votes: parseInt(data[index][0], 10),
    slots: data[index][1].map((a, i) => ({
      address: a,
      timestamp: parseInt(data[index][2][i], 10)
    }))
  }));
};

const getNewAuthorityPolls = async () => {
  const addresses = await callMethod('getAddNewPollAddresses');
  const data = await Promise.all(
    addresses.map(address => callMethod('addNewPoll', address))
  );
  return addresses.map((address, index) => ({
    address,
    closeTime: data[index].closeTime,
    votes: parseInt(data[index].votes, 10)
  }));
};

const getBlacklistPolls = async () => {
  const addresses = await callMethod('getAuthorityBlacklistPollAddresses');
  const data = await Promise.all(
    addresses.map(address => callMethod('authorityBlacklistPoll', address))
  );
  return addresses.map((address, index) => ({
    address,
    closeTime: data[index].closeTime,
    votes: parseInt(data[index].votes, 10),
    isVoted: data[index].voted || false
  }));
};

const saveOrUpdateAuthorities = authorities => {
  authorities.forEach(authority => {
    const { address, votes } = authority;
    const slots = authority.slots.map(({ address, timestamp }) =>
      AuthoritySlot({ address, timestamp })
    );
    Authority.update(
      { address: address },
      { address, slots, votes },
      { upsert: true, setDefaultsOnInsert: true },
      (err, data) => {
        if (err) console.log(err);
      }
    );
  });
};

const saveOrUpdatePolls = (polls, type = 0) => {
  if (![0, 1].includes(type)) return;

  polls.forEach(poll => {
    const { address } = poll;
    Poll.update(
      { address },
      { ...poll, type },
      { upsert: true, setDefaultsOnInsert: true },
      (err, data) => {
        if (err) console.log(err);
      }
    );
  });
};

const disableFinalisedPolls = addressesToDelete => {
  Poll.updateMany(
    { address: { $nin: addressesToDelete }, isDisabled: false },
    { $set: { isDisabled: true } },
    (err, data) => {
      if (err) console.log(err);
    }
  );
};

const saveOrUpdateData = async (
  authorities,
  authorityPolls,
  blacklistPolls
) => {
  saveOrUpdateAuthorities(authorities);
  disableFinalisedPolls(
    [...authorityPolls, ...blacklistPolls].map(p => p.address)
  );
  saveOrUpdatePolls(authorityPolls, 0);
  saveOrUpdatePolls(blacklistPolls, 1);
};

let timeout;
const syncronize = async () => {
  clearTimeout(timeout);
  try {
    const [authorities, authorityPolls, blacklistPolls] = await Promise.all([
      getAuthorities(),
      getNewAuthorityPolls(),
      getBlacklistPolls()
    ]);
    saveOrUpdateData(authorities, authorityPolls, blacklistPolls);
  } finally {
    setTimeout(syncronize, SYNC_TIMEOUT);
  }
};

syncronize();
// Инициализирвоать web3 и контракт
// Получить авторити ноды, активные голосования и блэклисты
// Сохранить в монгу
// Синхронизировать каждые 3 секунды, проверяя
// изменения в базе и сохраняя при изменении

// Сделать роут для получения данных из монги
