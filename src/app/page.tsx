import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserAvatar } from "@/components/UserAvatar";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 flex flex-col items-center relative overflow-hidden">

      {/* Luminous glowing background orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
      </div>

      {/* Grid pattern overlay for tech feel */}
      <div className="absolute top-0 left-0 right-0 h-[100vh] bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <main className="relative z-10 w-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center px-4 max-w-4xl">

        <div className="inline-block mb-4 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-sm font-medium tracking-wide">
          ✨ Nền tảng học tập thế hệ mới
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight mb-6 leading-[1.1]">
          Nhớ mọi thứ <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            nhanh hơn gấp 10 lần
          </span>
        </h1>

        <p className="max-w-2xl text-lg sm:text-xl text-slate-400 mb-12 leading-relaxed">
          Sử dụng sức mạnh của Flashcard và thuật toán lặp lại ngắt quãng (Spaced Repetition) để đẩy giới hạn ghi nhớ của não bộ lên mức tối đa.
        </p>

        {session ? (
          <Link
            href="/dashboard"
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-indigo-600 font-pj rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 focus:ring-offset-slate-900 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] hover:shadow-[0_0_60px_-15px_rgba(99,102,241,0.7)] hover:-translate-y-1"
          >
            Đi tới Dashboard của bạn
            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        ) : (
          <div className="relative group">
            {/* Glowing animated border behind the button */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-tilt"></div>

            <Link
              href="/register"
              className="relative inline-flex items-center justify-center px-10 py-5 text-xl font-bold text-white transition-all duration-200 bg-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 focus:ring-offset-slate-900 hover:bg-slate-800"
            >
              Bắt đầu hoàn toàn miễn phí
              <svg className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </Link>
          </div>
        )}

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce text-slate-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </main>

      {/* Feature Section */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-slate-800/50 mt-12 bg-slate-950/50 backdrop-blur-sm">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Tại sao chọn FlashCard?</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">Được thiết kế dựa trên khoa học thần kinh để giúp bạn ghi nhớ mọi thứ lâu hơn với thời gian học ít nhất.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl hover:bg-slate-800/50 transition-colors group">
            <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3">Lặp lại ngắt quãng</h3>
            <p className="text-slate-400 leading-relaxed">
              Thuật toán tự động tính toán thời điểm hoàn hảo để nhắc bạn ôn tập trước khi bạn chuẩn bị quên đi kiến thức.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl hover:bg-slate-800/50 transition-colors group">
            <div className="w-14 h-14 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3">Tốc độ & Tập trung</h3>
            <p className="text-slate-400 leading-relaxed">
              Giao diện tối giản loại bỏ mọi sự phân tâm. Bạn chỉ mất vài giây để tạo bộ thẻ và có thể bắt đầu học ngay lập tức.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl hover:bg-slate-800/50 transition-colors group">
            <div className="w-14 h-14 bg-pink-500/10 text-pink-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-3">Học mọi lúc mọi nơi</h3>
            <p className="text-slate-400 leading-relaxed">
              Dữ liệu của bạn được đồng bộ hóa tức thì trên mọi thiết bị. Ôn tập trên điện thoại khi di chuyển dễ dàng.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full py-8 text-center border-t border-slate-800/50">
        <p className="text-slate-500 text-sm">© {new Date().getFullYear()} FlashCard. All rights reserved.</p>
      </footer>
    </div>
  );
}
