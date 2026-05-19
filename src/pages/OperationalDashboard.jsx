import { Link } from "react-router-dom";

import { modulesForArea } from "@/lib/operationalModules";


export default function OperationalDashboard({ area }) {
  const modules = modulesForArea(area);

  return (
    <div>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Unified Operational Shell
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Horizon {area} workspace
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This feature-flagged shell links the independent Firebase, PostgreSQL,
          document, scheduling, audit, and migration health modules into one
          operational surface. Production Base44 pages remain unchanged.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <Link
            className="rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-400"
            key={module.key}
            to={`/app/${area}/${module.key}`}
          >
            <module.icon className="h-5 w-5 text-slate-500" />
            <h2 className="mt-4 text-base font-semibold text-slate-900">
              {module.label}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {module.description}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
