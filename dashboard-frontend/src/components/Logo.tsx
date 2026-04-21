import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  linkTo?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ linkTo = '/home', size = 'md', className = '' }) => {
  const logo = (
    <span className={`or-logo or-logo-${size} ${className}`}>
      <span className="g-blue">O</span>
      <span className="g-red">r</span>
      <span className="g-yellow">c</span>
      <span className="g-blue">h</span>
      <span className="g-green">S</span>
      <span className="g-red">u</span>
      <span className="g-yellow">t</span>
      <span className="g-blue">r</span>
      <span className="g-green">a</span>
      <span className="g-red">.ai</span>
    </span>
  );

  if (linkTo) {
    return <Link to={linkTo} className="or-logo-link">{logo}</Link>;
  }
  return logo;
};

export default Logo;
