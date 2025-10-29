/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { UploadIcon, MagicWandIcon, PaletteIcon, SunIcon, PaintBrushIcon, PencilIcon, DownloadIcon, QuoteIcon } from './icons';
import SpaceTunnelAnimation from './SpaceTunnelAnimation';

interface StartScreenProps {
  onFileSelect: (files: FileList | null) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onFileSelect }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e.target.files);
  };

  const features = [
      {
        icon: MagicWandIcon,
        title: 'Intelligent Retouching',
        description: 'Make precise, localized edits with simple text prompts. Change colors, remove objects, or enhance details in any part of your image.',
      },
      {
        icon: PaletteIcon,
        title: 'Artistic Filters',
        description: 'Transform your photos with a single click. Apply stunning styles like Synthwave, Anime, Glitch, and more, or create your own.',
      },
      {
        icon: SunIcon,
        title: 'Professional Adjustments',
        description: 'Fine-tune your images with AI-powered global adjustments. Effortlessly correct lighting, enhance details, or blur the background.',
      },
      {
        icon: PaintBrushIcon,
        title: 'Creative Style Transfer',
        description: 'Imprint the artistic style of any image onto your own. Combine aesthetics to create unique and captivating new visuals.',
      },
    ];

  const howItWorksSteps = [
    {
      icon: UploadIcon,
      title: 'Upload Your Image',
      description: 'Start by selecting one or more images. We support JPG, PNG, WEBP, and GIF formats.',
    },
    {
      icon: PencilIcon,
      title: 'Describe Your Vision',
      description: 'Use simple text prompts to tell our AI what you want. From precise retouching to artistic filters, just say the word.',
    },
    {
      icon: DownloadIcon,
      title: 'Download & Share',
      description: 'Watch the magic happen in seconds. Download your high-quality, edited image and share it with the world.',
    },
  ];

  const testimonials = [
    {
      quote: "Vixel AI's retouching feature is mind-blowing. I removed a distracting element from a wedding photo with a simple prompt, and it looks completely seamless. A total game-changer for my workflow!",
      name: 'Jenna Ortiz',
      role: 'Photographer',
    },
    {
      quote: "The style transfer is my favorite tool. I can create unique, branded content for social media in minutes. It's like having a graphic designer on call 24/7.",
      name: 'Marcus Reid',
      role: 'Social Media Manager',
    },
    {
      quote: "As a developer, I'm impressed by the tech. As a user, I'm thrilled with the results. The 'Blur Background' adjustment gives my portraits that professional DSLR look instantly.",
      name: 'Chloe Chen',
      role: 'Indie Developer',
    },
  ];

  const handleCTAClick = () => {
    document.getElementById('image-upload-start')?.click();
  }

  return (
    <div 
      className="w-full"
      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        onFileSelect(e.dataTransfer.files);
      }}
    >
      {/* Hero Section */}
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDraggingOver ? 'bg-purple-500/10' : ''}`}>
        <div className={`w-full max-w-6xl mx-auto text-left p-8 rounded-2xl border-2 ${isDraggingOver ? 'border-dashed border-purple-400' : 'border-transparent'}`}>
            <div className="grid md:grid-cols-2 gap-16 items-center">
                {/* Left Column: Text & CTA */}
                <div className="flex flex-col gap-6 animate-fade-in text-center md:text-left">
                  <h1 className="text-5xl font-extrabold tracking-tight text-gray-100 sm:text-6xl md:text-7xl">
                    <span className="glitch glitch-text-white" data-text="Unleash Your">
                      Unleash Your
                    </span>
                    <span className="text-purple-600 block mt-2 glitch glitch-text-purple" data-text="Creative Vision.">
                      Creative Vision.
                    </span>
                  </h1>
                  <p className="max-w-xl text-lg text-gray-400 md:text-xl">
                    Experience the future of photo editing. Vixel AI transforms your ideas into stunning visuals with the power of generative AI.
                  </p>

                  <div className="mt-6 flex flex-col items-center md:items-start gap-4">
                      <label htmlFor="image-upload-start" className="btn-gradient-animated relative inline-flex items-center justify-center px-10 py-5 text-xl font-bold text-white rounded-full cursor-pointer group transition-all duration-500 shadow-lg shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-500/60 hover:-translate-y-1">
                          <UploadIcon className="w-6 h-6 mr-3 transition-transform duration-500 ease-in-out group-hover:rotate-[360deg] group-hover:scale-110" />
                          Upload Image(s)
                      </label>
                      <input id="image-upload-start" type="file" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} multiple />
                      <p className="text-sm text-gray-500">or drag and drop file(s)</p>
                  </div>
                </div>

                {/* Right Column: Visual Element */}
                <div className="hidden md:flex items-center justify-center animate-fade-in [animation-delay:200ms]">
                    <div className="relative w-full max-w-lg aspect-square">
                         <SpaceTunnelAnimation />
                    </div>
                </div>
            </div>
        </div>
      </div>
      
      {/* Features Section */}
      <section className="w-full max-w-7xl mx-auto py-20 px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-100">
              <span className="glitch glitch-text-white" data-text="Powerful Features,">
                Powerful Features,
              </span>
              <span className="text-purple-600 block mt-2 glitch glitch-text-purple" data-text="Effortless Results">
                Effortless Results
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto">
              Vixel AI provides a suite of advanced tools that are simple to use. Unleash your creativity without the steep learning curve.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="feature-card rounded-2xl p-8 text-center animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="w-16 h-16 bg-purple-900/50 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-100 mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full max-w-7xl mx-auto py-20 px-8">
        <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-100">
                Three Simple Steps to Perfection
            </h2>
            <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto">
                Editing has never been this intuitive.
            </p>
        </div>
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="absolute top-1/2 left-0 w-full h-px bg-gray-700/50 hidden md:block"></div>
            <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-purple-500 to-fuchsia-500 hidden md:block animate-pulse"></div>

            {howItWorksSteps.map((step, index) => (
                <div
                    key={step.title}
                    className="step-card relative text-center animate-fade-in p-6"
                    style={{ animationDelay: `${index * 200}ms` }}
                >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-gray-800 border-2 border-purple-500 rounded-full flex items-center justify-center text-xl font-bold text-purple-300">
                        {index + 1}
                    </div>
                    <div className="mt-10">
                      <step.icon className="w-12 h-12 mx-auto text-purple-400 mb-4" />
                      <h3 className="text-xl font-bold text-gray-100 mb-2">{step.title}</h3>
                      <p className="text-gray-400">{step.description}</p>
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full max-w-7xl mx-auto py-20 px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-100">
              Loved by Creatives Everywhere
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.name}
                className="testimonial-card flex flex-col justify-between rounded-2xl p-8 animate-fade-in"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                  <QuoteIcon className="w-10 h-10 text-purple-600 mb-4" />
                  <blockquote className="text-gray-300 italic mb-6 flex-grow">"{testimonial.quote}"</blockquote>
                  <div>
                      <p className="font-bold text-gray-100">{testimonial.name}</p>
                      <p className="text-sm text-purple-400">{testimonial.role}</p>
                  </div>
              </div>
            ))}
          </div>
      </section>

      {/* Final CTA Section */}
      <section className="w-full max-w-7xl mx-auto py-20 px-8">
        <div className="final-cta-bg relative rounded-2xl p-12 md:p-20 text-center overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-tr from-purple-950 via-gray-900 to-fuchsia-950 opacity-30"></div>
             <div className="relative">
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-100 mb-4">
                    Ready to Transform Your Images?
                </h2>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
                    Experience the future of photo editing. Get started for free—no sign-up required.
                </p>
                <button
                    onClick={handleCTAClick}
                    className="btn-gradient-animated relative inline-flex items-center justify-center px-10 py-5 text-xl font-bold text-white rounded-full cursor-pointer group transition-all duration-500 shadow-lg shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-500/60 hover:-translate-y-1">
                    <UploadIcon className="w-6 h-6 mr-3" />
                    Upload an Image
                </button>
             </div>
        </div>
      </section>

    </div>
  );
};

export default StartScreen;