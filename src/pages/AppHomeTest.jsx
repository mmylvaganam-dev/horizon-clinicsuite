import ProtectedAppLayout from "@/layouts/ProtectedAppLayout";


export default function AppHomeTest() {
  return (
    <ProtectedAppLayout title="Horizon Home">
      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Independent App Foundation
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Protected Horizon workspace
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            This page is the isolated shell for future Firebase and PostgreSQL
            backed workflows. Production Base44 pages remain unchanged.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">Shell status</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <StatusRow label="Auth provider" value="Firebase" />
            <StatusRow label="App user source" value="PostgreSQL scaffold" />
            <StatusRow label="Organization" value="Placeholder" />
            <StatusRow label="Production Base44" value="Unchanged" />
          </dl>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <FoundationCard title="Profile" value="ready" />
        <FoundationCard title="Roles" value="planned" />
        <FoundationCard title="Modules" value="planned" />
      </section>
    </ProtectedAppLayout>
  );
}

function StatusRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-medium text-slate-600">{label}</dt>
      <dd className="text-right text-slate-900">{value}</dd>
    </div>
  );
}

function FoundationCard({ title, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
