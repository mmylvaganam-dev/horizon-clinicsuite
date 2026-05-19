import { Link, useParams } from "react-router-dom";

import { AppEmptyState } from "@/components/app/AppStates";
import { moduleByKey } from "@/lib/operationalModules";


export default function OperationalModulePage({ area }) {
  const { moduleKey } = useParams();
  const module = moduleByKey(moduleKey);

  if (!module || !module.areas.includes(area)) {
    return (
      <AppEmptyState
        title="Module unavailable"
        message="This module is not available in the selected operational area."
      />
    );
  }

  const isDashboard = module.key === "dashboard";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <module.icon className="h-6 w-6 text-slate-500" />
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">
            {module.label}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {module.description}
          </p>
        </div>
        {!isDashboard && (
          <Link
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            to={module.testPath}
          >
            Open module
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatusCard label="Operational area" value={area} />
        <StatusCard label="Feature flag" value="Firebase auth required" />
        <StatusCard label="Production Base44" value="unchanged" />
      </div>
    </section>
  );
}


function StatusCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}
