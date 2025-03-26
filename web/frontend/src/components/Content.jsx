import Navbar from './Navbar.jsx';

const Content = () => {
    return (
        <div>
            <Navbar />
            <div className="p-6">
                <h1 className="text-3xl font-bold">Home Page</h1>
            </div>
            <div className="bg-red-500 text-red p-4">
                Tailwind is working!
            </div>
        </div>
    )
}

export default Content