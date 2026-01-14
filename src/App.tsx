import { Footer } from "@/components/Footer";
import { ImageUploader } from "@/components/ImageUploader";
import { Navbar } from "@/components/Navbar";

const App = () => {
  const handleUpload = (file: File) => {
    console.log("Uploaded file:", file.name);
    // TODO: Implement image processing
  };

  const handleNavbarUploadClick = () => {
    // TODO: Trigger file input click
    console.log("Upload button clicked");
  };

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-[#0a0f14] via-[#12171d] to-[#0a0f14]">
      <Navbar onUploadClick={handleNavbarUploadClick} />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Empty State - Upload Zone */}
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <ImageUploader onUpload={handleUpload} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default App;
