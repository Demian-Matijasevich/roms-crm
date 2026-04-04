// webapp/app/form/reporte-setter/page.tsx
import ReporteSetterForm from "./ReporteSetterForm";

export const dynamic = "force-dynamic";

export default async function ReporteSetterPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Reporte Diario</h2>
        <p className="text-muted text-sm mt-1">
          Registrá tus actividades diarias como setter
        </p>
      </div>

      <ReporteSetterForm />
    </div>
  );
}
