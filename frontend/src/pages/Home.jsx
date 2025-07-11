import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Promt from "../components/Promt";
import { PanelTopOpen } from "lucide-react";
import logo from "/genify1.webp";
import CodeView from "../components/CodeView";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  animate,
  easeInOut,
} from "motion/react";
import { NavLink } from "react-router";

function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState({
    workflowBar: false,
    historyBar: false,
  });
  const [lastPrompt, setLastPrompt] = useState("");
  const [lastChatId, setLastChatId] = useState(null);
  const [initialFiles, setInitialFiles] = useState({});
  const [sandboxFiles, setSandboxFiles] = useState({});
  const [promt, setPromt] = useState([]);
  const [codeLoading, setCodeLoading] = useState(false);
  const [mode, setMode] = useState("website");

  const Colors = ["#DD335C", "#ff5e57", "#e073c5", "#1E67C6", "#CE84CF"];
  const color = useMotionValue(Colors[0]);

  useEffect(() => {
    animate(color, Colors, {
      ease: easeInOut,
      duration: 10,
      repeat: Infinity,
      repeatType: "mirror",
    });
  }, []);

  const backgroundImage = useMotionTemplate`radial-gradient(125% 125% at 50% 0%,#020617 50%, ${color})`;
  const boxShadow = useMotionTemplate`0px 4px 24px ${color}`;

  return (
    <motion.div
      style={{ backgroundImage, boxShadow }}
      className="flex h-screen text-white overflow-hidden"
    >
      <div
        className={`${
          isSidebarOpen.historyBar
            ? "w-50 lg:w-60 fixed md:relative top-0 left-0 h-full z-100"
            : "w-0"
        }`}
      >
        <Sidebar
          isSidebarOpen={isSidebarOpen.historyBar}
          setIsSidebarOpen={setIsSidebarOpen}
          setPromt={setPromt}
          setSandboxFiles={setSandboxFiles}
        />
      </div>

      {/* Main content */}
      <div
        className={`flex-1 flex  ${
          isSidebarOpen.historyBar ? "w-[82%]" : "w-full"
        } `}
      >
        <div
          className={`w-full ${
            promt.length === 0 ? "w-full" : " lg:w-[50%]"
          } h-full`}
        >
          <div
            className={` ${
              isSidebarOpen.historyBar ? "hidden-visible" : ""
            }  w-full border-b  border-gray-800 bg-transparent left-0 flex  justify-between p-1.5 px-4`}
          >
            <div className="flex gap-2">
              <NavLink
                to="/"
                className={`flex items-center gap-1.5 text-[18px] font-bold relative z-50 text-gray-200 py-1`}
              >
                <img src={logo} alt="Webify Logo" className="h-7" />
                Webify
              </NavLink>

              <button
                onClick={() =>
                  setIsSidebarOpen((prev) => ({
                    ...prev,
                    historyBar: !prev.historyBar,
                  }))
                }
                className="cursor-pointer rounded-xl active:scale-95  p-1.5"
              >
                {isSidebarOpen.historyBar ? (
                  <PanelTopOpen className="w-6 h-6 rotate-90" />
                ) : (
                  <PanelTopOpen className="w-6 h-6 -rotate-90" />
                )}
              </button>
            </div>
            <NavLink to="/" className="bg-gradient-to-r from-rose-500 via-white/10 shadow shadow-white px-3 py-1 rounded-lg cursor-pointer relative z-2">Home</NavLink>
            <div
              onClick={() =>
                setIsSidebarOpen((prev) => ({
                  ...prev,
                  workflowBar: !prev.workflowBar,
                }))
              }
              className="lg:hidden flex items-center gap-1"
            >
              <div className="text-[16px] font-bold">Preview</div>
              <button className="flex cursor-pointer rounded-xl active:scale-95  p-1.5">
                {isSidebarOpen.workflowBar ? (
                  <PanelTopOpen className="w-6 h-6 -rotate-90" />
                ) : (
                  <PanelTopOpen className="w-6 h-6 rotate-90" />
                )}
              </button>
            </div>
          </div>
          <div
            className={`h-[93.8%] relative z-10 ${
              promt.length === 0 ? "" : "lg:w-120"
            } px-2 flex items-center`}
          >
            <Promt
              promt={promt}
              setPromt={setPromt}
              setInitialFiles={setInitialFiles}
              onPromptComplete={(input, chatId) => {
                setLastPrompt(input);
                setLastChatId(chatId);
              }}
              setIsSidebarOpen={setIsSidebarOpen}
              codeLoading={codeLoading}
              setMode={setMode}
              mode={mode}
            />
          </div>
        </div>

        <div
          className={`h-full w-full text-black lg:relative pt-5 lg:pt-9 fixed top-12 lg:top-0 z-50 lg:px-0 lg:mr-2 ${
            promt.length === 0 ? "hidden" : ""
          } ${
            isSidebarOpen.workflowBar ? "translate-x-0" : " translate-x-full"
          } lg:translate-x-0 transition-all duration-500`}
        >
          <div className="h-[92%] mx-2 select-none lg:h-[98%] backdrop-blur-2xl rounded-2xl shadow shadow-sky-500">
            <CodeView
              prompt={lastPrompt}
              chatId={lastChatId}
              initialFiles={initialFiles}
              setSandboxFiles={setSandboxFiles}
              sandboxFiles={sandboxFiles}
              setPromt={setPromt}
              setCodeLoading={setCodeLoading}
              mode={mode}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Home;
