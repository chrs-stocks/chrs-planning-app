import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AstreintePlanning: React.FC<{ schoolHolidays: Set<string> }> = () => {
  const [currentDate] = useState(new Date());

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-400 italic">
        Planning Astreintes (Désactivé) - {format(currentDate, 'MMMM yyyy', { locale: fr })}
      </h2>
      <p className="text-gray-500">Ce module n'est plus utilisé.</p>
    </div>
  );
};

export default AstreintePlanning;
