import React from 'react';

const featureTiles = [
  {
    title: 'Realtime-kvitton',
    description: 'Fota kvitton direkt i appen och låt AI föreslå konto och moms automatisk.',
  },
  {
    title: 'Swish & bankpush',
    description: 'Notifieringar från Swish, SEB, Nordea och Handelsbanken inom sekunder.',
  },
  {
    title: 'Styrelseflöden',
    description: 'Signera årsredovisning och attestera leverantörsfakturor från mobilen.',
  }
];

const MobileAppPage: React.FC = () => {
  return (
    <section className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white py-20">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl font-bold leading-tight">Mobilapp för bokföring på språng</h1>
            <p className="mt-6 text-lg text-blue-50">
              Den responsiva PWA-upplevelsen ger dig bokföring, bankflöden och dokumenthantering i fickan.
              Pushnotiser, offline-läge och FaceID-inloggning gör att du alltid håller koll på kvitton och attestflöden.
            </p>
            <div className="mt-8 flex space-x-4">
              <button className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg shadow hover:shadow-lg transition">
                Lägg till på hemskärmen
              </button>
              <button className="border border-white px-6 py-3 rounded-lg hover:bg-white hover:text-blue-600 transition">
                Se kollaborationsflöden
              </button>
            </div>
          </div>

          <div className="bg-white text-gray-900 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Mobil översikt</h2>
              <span className="text-sm text-blue-500">Företag & Förening</span>
            </div>
            <div className="mt-6 space-y-4">
              {featureTiles.map(tile => (
                <div key={tile.title} className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                  <h3 className="text-lg font-semibold text-blue-700">{tile.title}</h3>
                  <p className="text-sm text-blue-600 mt-2">{tile.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 rounded-2xl bg-blue-100 text-blue-800">
              <p className="text-sm font-medium">Digital signering</p>
              <p className="text-xs mt-1">BankID och eIDAS-certifierade signaturer med audit logg.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileAppPage;
