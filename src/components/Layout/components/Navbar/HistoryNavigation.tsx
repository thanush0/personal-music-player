import { Space } from 'antd';

import NavigationButton from './NavigationButton';
import ForwardBackwardsButton from './ForwardBackwardsButton';

import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { FaSpotify } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import { Tooltip } from '../../../Tooltip';

const HistoryNavigation = memo(() => {
  const { t } = useTranslation(['navbar']);
  const navigate = useNavigate();
  
  return (
    <Space>
      <Tooltip title="Settings">
        <button
          onClick={() => navigate('/settings')}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            borderRadius: '50%',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <FaSpotify size={32} fill='white' />
        </button>
      </Tooltip>

      <div className='flex flex-row items-center gap-2 h-full'>
        <ForwardBackwardsButton flip />
        <ForwardBackwardsButton flip={false} />
      </div>
    </Space>
  );
});

export default HistoryNavigation;
