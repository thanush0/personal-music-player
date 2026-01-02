import { Col, Row, Button } from 'antd';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DownloadOutlined } from '@ant-design/icons';
import HistoryNavigation from './HistoryNavigation';
import Header from './Header';
import { Search } from './Search';

export const Navbar = memo(() => {
  const navigate = useNavigate();

  return (
    <Row
      align='middle'
      gutter={[16, 16]}
      className='navbar'
      justify='space-between'
      style={{ margin: '0 5px' }}
    >
      <Col>
        <HistoryNavigation />
      </Col>

      <Col span={0} md={12} lg={10} xl={8} style={{ textAlign: 'center' }}>
        <Search />
      </Col>

      <Col style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => navigate('/download')}
          style={{
            background: 'linear-gradient(90deg, #1db954 0%, #1ed760 100%)',
            border: 'none',
            boxShadow: '0 2px 8px rgba(29, 185, 84, 0.3)',
          }}
        >
          Download Music
        </Button>
        <Header opacity={1} />
      </Col>
    </Row>
  );
});
