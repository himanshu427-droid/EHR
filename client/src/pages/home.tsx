import { Link } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, FileText, Users, Database, ArrowRight, Heart } from 'lucide-react';

export default function HomePage() {
    const { isAuthenticated, user } = useAuth();

    const features = [
        {
            icon: <Shield className="h-8 w-8" />,
            title: "Secure & Private",
            description: "Military-grade encryption ensures your health data remains confidential and secure."
        },
        {
            icon: <FileText className="h-8 w-8" />,
            title: "Digital Health Records",
            description: "Access your complete medical history anytime, anywhere in digital format."
        },
        {
            icon: <Users className="h-8 w-8" />,
            title: "Doctor Collaboration",
            description: "Seamless sharing of medical records with healthcare providers when you consent."
        },
        {
            icon: <Database className="h-8 w-8" />,
            title: "Blockchain Verified",
            description: "Tamper-proof medical records using blockchain technology for ultimate trust."
        }
    ];

    const stats = [
        { value: "50K+", label: "Patients Served" },
        { value: "500+", label: "Healthcare Providers" },
        { value: "1M+", label: "Secure Records" },
        { value: "99.9%", label: "Uptime Reliability" }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Navigation */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <Heart className="h-8 w-8 text-blue-600" />
                            <span className="text-xl font-bold text-gray-900">MedChain EHR</span>
                        </div>

                        <div className="flex items-center space-x-4">
                            {isAuthenticated ? (
                                <>
                                    <span className="text-sm text-gray-700">Welcome, {user?.name}</span>
                                    <Link href="/dashboard">
                                        <Button>Go to Dashboard</Button>
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link href="/login">
                                        <Button variant="ghost">Sign In</Button>
                                    </Link>
                                    <Link href="/register">
                                        <Button>Get Started</Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
                        Revolutionizing
                        <span className="text-blue-600 block">Healthcare Records</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        Secure, decentralized electronic health records powered by blockchain technology.
                        Take control of your medical data with unprecedented privacy and accessibility.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        {isAuthenticated ? (
                            <Link href="/dashboard">
                                <Button size="lg" className="gap-2">
                                    Go to Dashboard <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        ) : (
                            <>
                                <Link href="/register">
                                    <Button size="lg" className="gap-2">
                                        Get Started Free <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                                <Link href="/login">
                                    <Button size="lg" variant="outline">
                                        Sign In
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-12 bg-white/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {stats.map((stat, index) => (
                            <div key={index}>
                                <div className="text-3xl font-bold text-blue-600">{stat.value}</div>
                                <div className="text-gray-600 mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            Why Choose MedChain EHR?
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            We're building the future of healthcare records with cutting-edge technology
                            and patient-first design.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => (
                            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg text-blue-600 mb-4">
                                        {feature.icon}
                                    </div>
                                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-gray-600">
                                        {feature.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 bg-white/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            How It Works
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                                1
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Create Account</h3>
                            <p className="text-gray-600">
                                Sign up and verify your identity to create your secure health profile.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                                2
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Manage Records</h3>
                            <p className="text-gray-600">
                                Upload, view, and manage your medical records with complete control.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                                3
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Share Securely</h3>
                            <p className="text-gray-600">
                                Grant temporary access to healthcare providers when needed.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                        Ready to Take Control of Your Health Data?
                    </h2>
                    <p className="text-xl text-gray-600 mb-8">
                        Join thousands of patients and healthcare providers already using MedChain EHR.
                    </p>
                    {isAuthenticated ? (
                        <Link href="/dashboard">
                            <Button size="lg" className="gap-2">
                                Go to Dashboard <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    ) : (
                        <Link href="/register">
                            <Button size="lg" className="gap-2">
                                Start Your Journey <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-6">
                        <Heart className="h-6 w-6 text-blue-400" />
                        <span className="text-xl font-bold">MedChain EHR</span>
                    </div>
                    <p className="text-gray-400 mb-4">
                        Secure, decentralized electronic health records for the modern healthcare ecosystem.
                    </p>
                    <p className="text-gray-500 text-sm">
                        © 2024 MedChain EHR. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}