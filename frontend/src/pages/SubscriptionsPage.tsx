import React from 'react';

const plans = [
  {
    name: 'Basic',
    price: '49 kr',
    cadence: 'per månad',
    description: 'All daglig bokföring, bankkopplingar och AI-automatisering.',
    includes: [
      '6 månaders gratis provperiod',
      'Automatiserad bankavstämning',
      'AI-dokumenttolkning och kvittoflöden',
      'Lön och arbetsgivardeklaration på individnivå'
    ],
    excludes: ['Årsredovisning', 'Årsdeklaration']
  },
  {
    name: 'Full Professional',
    price: '99 kr',
    cadence: 'per månad',
    description: 'För bolag och föreningar som behöver kompletta årsavslut.',
    includes: [
      'Allt i Basic',
      'Årsredovisning (K2/K3)',
      'Årsdeklaration (INK2, INK3, INK4)',
      'Styrelseportal och attestflöden'
    ],
    excludes: []
  }
];

const SubscriptionsPage: React.FC = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">SaaS-abonnemang för svenska bolag</h1>
          <p className="mt-4 text-gray-600 max-w-3xl mx-auto">
            Välj ett paket som passar din verksamhet. Alla planer inkluderar obegränsade användare,
            bankkopplingar, AI-automatisering och stöd för både aktiebolag och föreningar.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {plans.map(plan => (
            <div key={plan.name} className="bg-white shadow-lg rounded-2xl p-8 border border-blue-100">
              <h2 className="text-2xl font-semibold text-gray-900">{plan.name}</h2>
              <p className="mt-2 text-sm text-blue-600 uppercase tracking-wide">{plan.price} {plan.cadence}</p>
              <p className="mt-4 text-gray-600">{plan.description}</p>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Ingår</h3>
                <ul className="mt-3 space-y-2 text-gray-700">
                  {plan.includes.map(item => (
                    <li key={item} className="flex items-start">
                      <span className="mt-1 mr-2 text-green-500">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.excludes.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Ingår ej</h3>
                  <ul className="mt-3 space-y-2 text-gray-500">
                    {plan.excludes.map(item => (
                      <li key={item} className="flex items-start">
                        <span className="mt-1 mr-2 text-red-400">✕</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-300">
                Starta gratis provperiod
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-white rounded-2xl shadow-md p-10">
          <h2 className="text-2xl font-bold text-gray-900">Så fungerar fakturering och provperiod</h2>
          <p className="mt-4 text-gray-600">
            Alla kunder får 6 månader kostnadsfritt. Vi hanterar återkommande debitering via Autogiro eller kort.
            Före provperiodens slut skickas automatiska påminnelser. Föreningar kan välja årsbetalning till reducerad kostnad.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SubscriptionsPage;
