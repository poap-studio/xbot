/**
 * Admin Dashboard Page
 * Main page for bot administration
 */

import { BotConnection } from '@/components/admin/BotConnection';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Gestiona la configuración del bot de Twitter y POAP
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <BotConnection />

          {/* Placeholder for future admin components */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Configuración de POAP</h2>
            <p className="text-gray-600">
              Configuración de POAP event estará disponible próximamente...
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Estadísticas</h2>
            <p className="text-gray-600">
              Estadísticas de entregas estarán disponibles próximamente...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
