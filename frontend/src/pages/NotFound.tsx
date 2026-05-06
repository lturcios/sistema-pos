import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">404</h1>
            <p className="mt-4 text-xl text-muted-foreground">Página no encontrada</p>
            <Link to="/" className="mt-6 text-primary hover:underline">
                Volver al inicio
            </Link>
        </div>
    );
}
