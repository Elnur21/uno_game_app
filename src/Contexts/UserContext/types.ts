import {User} from '../../types/types';

interface UserContextType {
  isSigned: boolean;
  setIsSigned: (isSigned: boolean) => void;
  user: User;
  setUser: (isSigned: boolean) => void;
}

export default UserContextType;
