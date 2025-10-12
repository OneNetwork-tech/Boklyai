import React from 'react';

const serviceHighlights = [
  {
    title: 'Central klientöversikt',
    description:
      'Hantera alla kundbolag i ett gemensamt flöde. Se status för moms, årsredovisning och löneutbetalningar på ett ögonblick.'
  },
  {
    title: 'Snabb onboarding',
    description:
      'Skapa nya kundkonton eller koppla befintliga bolag till byrån. All nödvändig företagsdata registreras på några sekunder.'
  },
  {
    title: 'Roller och åtkomst',
    description:
      'Definiera vilka konsulter som ansvarar för respektive kund. Tilldela behörigheter för bokföring, betalningar och rapportering.'
  }
];

const AgencyPortalPage: React.FC = () => {
  return (
    <section className="py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900">Byråkonto för redovisningsbyråer</h1>
          <p className="mt-4 text-gray-600">
            Byggt för svenska redovisningskonsulter som behöver skala sin rådgivning. BoklyAI låter byrån skapa ett huvudkonto,
            bjuda in kollegor och skapa underkonton för varje kund – oavsett bolagsform eller förening.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {serviceHighlights.map(highlight => (
            <div key={highlight.title} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-left">
              <h2 className="text-xl font-semibold text-blue-700">{highlight.title}</h2>
              <p className="mt-3 text-gray-600 text-sm">{highlight.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid lg:grid-cols-2 gap-10 items-stretch">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h3 className="text-2xl font-semibold text-gray-900">Automatiserad kunduppstart</h3>
            <p className="mt-4 text-gray-600 text-sm">
              Fyll i kundens organisationsnummer och kontaktuppgifter så skapar BoklyAI ett färdigt bolagskonto inklusive
              standardiserad kontoplan. Du kan även koppla befintliga BoklyAI-kunder till byrån med bibehållen historik.
            </p>
            <ul className="mt-6 space-y-3 text-gray-600 text-sm">
              <li>• Ange uppdragets omfattning och fakturera enligt abonnemangsplan.</li>
              <li>• Dela dokument, uppgifter och deadlines mellan byrå och kund.</li>
              <li>• Synka bankkonton, momsperioder och löneunderlag automatiskt.</li>
            </ul>
          </div>

          <div className="bg-blue-900 text-white rounded-2xl p-8 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-semibold">Premiumservice för rådgivare</h3>
              <p className="mt-4 text-blue-100 text-sm">
                Arbetsflöden för månadsbokslut, årsredovisning och deklaration byggs direkt kring byråns process. Skapa checklistor,
                följ upp status i realtid och notifiera kundens kontaktperson med ett klick.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-blue-100">
              <div>
                <p className="font-semibold">Kundteam</p>
                <p>Ge flera konsulter åtkomst till samma kund och dela arbetsbördan utan dubbelarbete.</p>
              </div>
              <div>
                <p className="font-semibold">Rapportpaket</p>
                <p>Skicka paket med rapporter, AGI och momsdeklarationer direkt från portalen.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AgencyPortalPage;
