import SongDetails from './SongDetails';
import PlayControls from './PlayControls';
import ExtraControlButtons from './ExtraButtons';
import AudioEnhancementControl from './AudioEnhancementControl';
import NowPlayingBarMobile from './mobilePlayer';
import { MobileMenu } from './mobileMenu';
import { OtherDeviceAlert } from './otherDevice';

import { useAppSelector } from '../../../../store/store';

const NowPlayingBar = () => {
  const isExpandedOpen = useAppSelector((state) => state.ui.expandedPlayerOpen);

  if (isExpandedOpen) {
    // Hide the bottom mini-player while expanded player is active
    return null;
  }

  return (
    <>
      <div>
        <div className='w-full bg-black p-4 flex items-center justify-between h-full mobile-hidden'>
          <SongDetails />
          <PlayControls />
          <div className="flex items-center gap-2">
            <AudioEnhancementControl />
            <ExtraControlButtons />
          </div>
        </div>

        <OtherDeviceAlert />
      </div>

      <div className='mobile-bar'>
        <NowPlayingBarMobile />
        <MobileMenu />
      </div>
    </>
  );
};

export default NowPlayingBar;
