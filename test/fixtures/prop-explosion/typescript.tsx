import React from 'react';

// This interface should NOT be flagged
interface UserProfileProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  address: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  onUpdate: () => void;
}

// This component SHOULD be flagged (10 props)
const UserProfile: React.FC<UserProfileProps> = ({ firstName, lastName, email, phone, avatar, address, role, permissions, isActive, onUpdate }) => {
  return (
    <div>
      <h1>{firstName} {lastName}</h1>
      <p>{email}</p>
    </div>
  );
};

// Type alias — should NOT be flagged
type FormConfig = {
  field1: string;
  field2: string;
  field3: string;
  field4: string;
  field5: string;
  field6: string;
  field7: string;
  field8: string;
};

export default UserProfile;
