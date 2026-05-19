export function AppLoadingState({ message = "Loading" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
      {message}
    </div>
  );
}


export function AppErrorState({ title = "Error", message }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-900">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 break-all text-sm">{message || "Something went wrong"}</div>
    </div>
  );
}


export function AppEmptyState({ title, message }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{message}</div>
    </div>
  );
}
