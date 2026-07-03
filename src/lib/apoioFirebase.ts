/**
 * Conexão ao Firebase do "Material de apoio" (projeto apoio-nox), SEM migrar dados.
 * O CRM usa um segundo app Firebase nomeado ('apoio') só para ler/escrever
 * as coleções `imoveis` e `construtoras` que já vivem no apoio-nox.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const apoioConfig = {
  apiKey: 'AIzaSyBRiSro90kafN-1sKwB-vZPI43-RX63_Xg',
  authDomain: 'apoio-nox.firebaseapp.com',
  projectId: 'apoio-nox',
  storageBucket: 'apoio-nox.firebasestorage.app',
  messagingSenderId: '110646960536',
  appId: '1:110646960536:web:422f238d678a1286a48bed',
};

const APOIO_APP_NAME = 'apoio';
const apoioApp =
  getApps().find((a) => a.name === APOIO_APP_NAME) ?? initializeApp(apoioConfig, APOIO_APP_NAME);

export const apoioDb = getFirestore(apoioApp);
export const apoioStorage = getStorage(apoioApp);
