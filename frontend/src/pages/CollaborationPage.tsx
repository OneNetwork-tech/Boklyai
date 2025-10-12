import React from 'react';

const collaborationPillars = [
  {
    title: 'Roller & behörigheter',
    description: 'Ge redovisningskonsulter och föreningskassörer rätt nivå av åtkomst med fina-grained roller.'
  },
  {
    title: 'Kommentera allt',
    description: 'Lämna tidsstämplade kommentarer på verifikationer, dokument och årsredovisningar.'
  },
  {
    title: 'Revision och loggar',
    description: 'Fullständig audit logg för BankID-signaturer, export till Skatteverket och ändringar i huvudboken.'
  }
];

const CollaborationPage: React.FC = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900">Samarbeta med byrå, styrelse och medlemmar</h1>
          <p className="mt-4 text-gray-600">
            BoklyAI är byggt för både aktiebolag och ideella föreningar. Dela dokument, godkänn betalningar och signera årsredovisningen
            tillsammans utan att lämna plattformen.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {collaborationPillars.map(pillar => (
            <div key={pillar.title} className="p-6 bg-gray-50 border border-gray-200 rounded-2xl shadow-sm">
              <h2 className="text-xl font-semibold text-blue-700">{pillar.title}</h2>
              <p className="mt-3 text-gray-600 text-sm">{pillar.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid lg:grid-cols-2 gap-10">
          <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100">
            <h3 className="text-2xl font-semibold text-blue-800">Föreningsläge</h3>
            <p className="mt-3 text-blue-700 text-sm">
              Bjud in styrelsemedlemmar och kassörer. Medlemstransaktioner kopplas till Bankgiro och Swish och kvitton
              sparas för automatisk uppföljning.
            </p>
            <ul className="mt-4 space-y-2 text-blue-700 text-sm">
              <li>• Enkel medlemsfakturering och presentlista</li>
              <li>• Automatiserad idrottsbidrag-rapportering</li>
              <li>• Dokumentdelning för stadgar och protokoll</li>
            </ul>
          </div>

          <div className="bg-gray-900 text-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-semibold">Byråportalen</h3>
            <p className="mt-3 text-gray-200 text-sm">
              Certifierade redovisningskonsulter kan arbeta parallellt med kundens team. Hantera arbetsuppgifter,
              skapa årsdeklarationer och skicka digitala signeringsunderlag.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-gray-100">
              <div>
                <p className="font-semibold">Arbetsuppgifter</p>
                <p>Automatiska uppgifter för moms, AGI och årsredovisning.</p>
              </div>
              <div>
                <p className="font-semibold">Chatt & notifieringar</p>
                <p>Inbyggd chatt med notiser till e-post, Slack och Teams.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CollaborationPage;
