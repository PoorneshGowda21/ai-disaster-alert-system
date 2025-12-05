// src/App.jsx
export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold text-sky-600 mb-4">
          Tailwind is Working! 🎉
        </h1>

        <p className="text-gray-700">
          If you see this blue heading, Tailwind CSS is applied successfully.
        </p>

        <button className="mt-6 px-5 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700">
          Test Button
        </button>
      </div>
    </div>
  );
}
