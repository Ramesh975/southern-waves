import { FaTwitter, FaFacebookF, FaWhatsapp, FaLink } from 'react-icons/fa';
import toast from 'react-hot-toast';

const ShareRail = ({ title, url }) => {
  const shareUrl = encodeURIComponent(url || window.location.href);
  const shareTitle = encodeURIComponent(title || '');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url || window.location.href);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className="share-rail">
      <span className="share-rail-label">SHARE</span>
      <a
        href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn twitter"
        title="Share on Twitter"
      >
        <FaTwitter size={18} />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn facebook"
        title="Share on Facebook"
      >
        <FaFacebookF size={18} />
      </a>
      <a
        href={`https://api.whatsapp.com/send?text=${shareTitle}%20${shareUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn whatsapp"
        title="Share on WhatsApp"
      >
        <FaWhatsapp size={18} />
      </a>
      <button onClick={copyToClipboard} className="share-btn copy" title="Copy Link">
        <FaLink size={16} />
      </button>
    </div>
  );
};

export default ShareRail;
