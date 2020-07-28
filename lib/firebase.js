const firebase = require('firebase/app');
require('firebase/database');
require('firebase/auth');
require('firebase/firestore');

const firebaseConfig = require('../config.json').firebaseConfig

firebase.initializeApp(firebaseConfig);

module.exports.firebaseAuth = firebase.auth();
// export const firestore = firebase.firestore();