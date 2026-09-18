import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { DrawerActions, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faEdit, faPaperPlane, faTimes } from "@fortawesome/free-solid-svg-icons";
import CustomHeader from "../../components/CustomHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../theme";
import { Picker } from "@react-native-picker/picker";
import { AuthContext } from "../../context/AuthContext";
import { useContext } from "react";
import LinearGradient from "react-native-linear-gradient";
import { useLanguage } from "../../context/LanguageContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchPhpTodoList, replyPhpTodo, updatePhpTodoStatus } from "../../services/phpApi";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 64;
const ACCENT = colors.accent;
const SCREEN_BG = colors.bg;
const SURFACE_YELLOW = '#132746';
const SURFACE_YELLOW_DEEP = '#132746';
const INPUT_BG = '#132746';
const TEXT_DARK = colors.black;
const CREATED_TODO_CACHE_KEY = "crewcam_created_todos";
const TODO_STATUS_CACHE_KEY = 'crewcam_todo_status';

const getTodoCacheKey = (token: string) => `${CREATED_TODO_CACHE_KEY}:${token.trim()}`;
const getTodoCacheKeys = (token: string) => [
  getTodoCacheKey(token),
  CREATED_TODO_CACHE_KEY,
];
const getTodoStatusCacheKey = (token: string) => `${TODO_STATUS_CACHE_KEY}:${token.trim()}`;

const normalizeTodoValue = (value: any) => String(value || '').trim();
const getTodoId = (item: any) =>
  String(item?._id || item?.id || item?.todo_id || item?.todoId || item?.tid || item?.td_id || '');

const looksLikeIdentifier = (value: string) =>
  /^\d+$/.test(value) ||
  /^[a-f0-9]{16,}$/i.test(value) ||
  /^[A-Za-z0-9_-]{20,}$/.test(value) ||
  value.includes('.');

const extractAssignedMembers = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .flatMap((entry) => String(entry?.member || entry?.id || entry?.emp_id || '').split(','))
        .map(normalizeTodoValue)
        .filter(Boolean);
    }
  } catch {
    // Plain text assignment, handled below.
  }

  return value.includes(',')
    ? value.split(',').map(normalizeTodoValue).filter(Boolean)
    : [];
};

const syncCachedTodoStatus = async (token: string, todoId: string, nextStatus: string) => {
  const cacheKey = getTodoCacheKey(token);
  const cachedRaw = await AsyncStorage.getItem(cacheKey);
  if (!cachedRaw) {
    return;
  }

  let cachedTodos: any[] = [];
  try {
    cachedTodos = JSON.parse(cachedRaw);
  } catch {
    cachedTodos = [];
  }

  const updatedTodos = cachedTodos.map((item) =>
    getTodoId(item) === todoId
      ? {...item, status: nextStatus}
      : item,
  );

  await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedTodos));

  const statusCacheKey = getTodoStatusCacheKey(token);
  const statusRaw = await AsyncStorage.getItem(statusCacheKey);
  let statusMap: Record<string, string> = {};
  try {
    statusMap = statusRaw ? JSON.parse(statusRaw) : {};
  } catch {
    statusMap = {};
  }
  statusMap[todoId] = nextStatus;
  await AsyncStorage.setItem(statusCacheKey, JSON.stringify(statusMap));
};

const getCachedTodoStatusMap = async (token: string) => {
  const cachedRaw = await AsyncStorage.getItem(getTodoCacheKey(token));
  let cachedTodos: any[] = [];
  try {
    cachedTodos = cachedRaw ? JSON.parse(cachedRaw) : [];
  } catch {
    cachedTodos = [];
  }

  const cachedStatusMap = cachedTodos.reduce<Record<string, string>>((acc, item) => {
    const id = getTodoId(item);
    const itemStatus = String(item?.status || '').trim();
    if (id && itemStatus) {
      acc[id] = itemStatus;
    }
    return acc;
  }, {});

  const statusRaw = await AsyncStorage.getItem(getTodoStatusCacheKey(token));
  let explicitStatusMap: Record<string, string> = {};
  try {
    explicitStatusMap = statusRaw ? JSON.parse(statusRaw) : {};
  } catch {
    explicitStatusMap = {};
  }

  return {
    ...cachedStatusMap,
    ...explicitStatusMap,
  };
};

const getCachedTodos = async (token: string) => {
  const cachedLists = await Promise.all(
    getTodoCacheKeys(token).map(async (cacheKey) => {
      const cachedRaw = await AsyncStorage.getItem(cacheKey);
      try {
        const parsed = cachedRaw ? JSON.parse(cachedRaw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }),
  );
  return cachedLists.flat();
};

const formatDateLabel = (value?: string | Date | null) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

type RootStackParamList = {
  Dashboard: undefined;
  Notification: undefined;
  CreateTodo: undefined;
  ToDoMain: { createdTodo?: any } | undefined;
  PreHome: { screen?: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

type TodoType = {
  id: string;
  assign_to: string;
  assign_By: string;
  deadline: string;
  description: string;
  status: string;
  added: string;
  replyed: { reply: string; reply_by: string; todo_id: string; datetime: string }[];
};

const getTodoListItems = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.todos)) return data.todos;
  if (Array.isArray(data?.todoList)) return data.todoList;
  if (Array.isArray(data?.todo_list)) return data.todo_list;
  if (Array.isArray(data?.tasks)) return data.tasks;
  if (data?.result && typeof data.result === "object") return getTodoListItems(data.result);
  if (data?.data && typeof data.data === "object") return getTodoListItems(data.data);
  if (data && typeof data === "object") {
    const hasTodoFields =
      data.description ||
      data.todo_description ||
      data.task ||
      data.title ||
      data.deadline ||
      data.todo_deadline;
    if (hasTodoFields) return [data];
  }
  return [];
};

const mapTodoForUi = (item: any): TodoType => ({
  id: getTodoId(item) || `todo-${Date.now()}`,
  assign_to:
    item.assign_to_name ||
    item.assignToName ||
    item.assigned_to_name ||
    item.emp_name ||
    item.assign_to ||
    (item.assignedTo ? (item.assignedTo.name || `${item.assignedTo.firstName || ''} ${item.assignedTo.lastName || ''}`) : ''),
  assign_By: item.assign_by || item.assign_By || item.assignedBy || item.created_by || 'Admin',
  deadline: formatDateLabel(item.deadline || item.due_date || item.todo_deadline),
  description: item.description || item.todo_description || item.task || item.title || '',
  status: item.status || item.currentStatus || item.current_status || 'Pending',
  added: formatDateLabel(item.added || item.createdAt || item.created_at),
  replyed: Array.isArray(item.replyed) ? item.replyed : [],
});

const TodoScreen = () => {
  const { userData } = useContext(AuthContext);
  const { t, formatName } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();

  const [todos, setTodos] = useState<TodoType[]>([]);
  const [loading, setLoading] = useState(false);

  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [status, setStatus] = useState("Pending");
  const [deadline, setDeadline] = useState("");
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  const getAssignedLabel = useCallback((value: string) => {
    const assignedValue = normalizeTodoValue(value);
    if (!assignedValue) return "";
    const assignedMembers = extractAssignedMembers(assignedValue);
    const currentIds = [
      userData.token,
    ].map(normalizeTodoValue).filter(Boolean);

    if (
      currentIds.includes(assignedValue) ||
      looksLikeIdentifier(assignedValue) ||
      (assignedMembers.length > 0 && assignedMembers.every((member) => currentIds.includes(member) || looksLikeIdentifier(member)))
    ) {
      return t("Self");
    }

    return formatName(assignedValue);
  }, [formatName, t, userData.token]);

  const fetchTodos = useCallback(async () => {
    const token = userData.token || await AsyncStorage.getItem("auth_token");
    const renderTodos = async (list: any[], cachedTodos: any[]) => {
      const cachedStatusMap = await getCachedTodoStatusMap(token);
      const mappedTodos = [...cachedTodos, ...list].map((item) => {
        const mappedItem = mapTodoForUi(item);
        return {
          ...mappedItem,
          status: cachedStatusMap[mappedItem.id] || mappedItem.status,
        };
      });
      const seen = new Set<string>();
      const dedupedTodos = mappedTodos.filter((item) => {
        const key = item.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setTodos(dedupedTodos);
    };

    try {
      if (!token) {
        Alert.alert("Error", "User not authenticated");
        return;
      }
      setLoading(true);

      const cachedTodos = await getCachedTodos(token);
      const data = await fetchPhpTodoList({token});
      const list = getTodoListItems(data);
      console.log("[TODO LIST RESPONSE]", JSON.stringify({
        count: list.length,
        fallbackCount: cachedTodos.length,
        response: data,
      }));
      await renderTodos(list, cachedTodos);
    } catch (err) {
      console.log("Fetch todos error:", err);
      if (token) {
        const cachedTodos = await getCachedTodos(token);
        await renderTodos([], cachedTodos);
        if (!cachedTodos.length) {
          Alert.alert("Error", "Failed to fetch todos");
        }
      } else {
        Alert.alert("Error", "Failed to fetch todos");
      }
    } finally {
      setLoading(false);
    }
  }, [userData.token]);

  useFocusEffect(
    useCallback(() => {
      const createdTodo = route.params?.createdTodo;
      if (createdTodo) {
        const mappedCreatedTodo = mapTodoForUi(createdTodo);
        setTodos((currentTodos) => {
          if (currentTodos.some((item) => item.id === mappedCreatedTodo.id)) {
            return currentTodos;
          }
          return [mappedCreatedTodo, ...currentTodos];
        });
        navigation.setParams({ createdTodo: undefined } as never);
      }
      fetchTodos();
    }, [fetchTodos, navigation, route.params?.createdTodo]),
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return ACCENT;
      case 'pending':
        return '#FFFFFF';
      case 'overdue':
        return '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '#FFFFFF';
      case 'pending':
        return '#55e6ee';
      case 'overdue':
        return '#55e6ee';
      default:
        return '#55e6ee';
    }
  };

  const renderTodo = ({ item }: { item: TodoType }) => (
    <LinearGradient
      colors={[SURFACE_YELLOW, SURFACE_YELLOW_DEEP]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.todoCard}
    >
      <View style={styles.todoRow}>
        <View style={styles.todoLeftSection}>
          <View style={styles.assignedContainer}>
            <Text style={styles.todoAssigned}>{t('To')}: {getAssignedLabel(item.assign_to)}</Text>
            <Text style={styles.todoDate}>{item.added}</Text>
          </View>

          <Text style={styles.todoDescription} numberOfLines={1}>
            {item.description}
          </Text>

          <View style={styles.deadlineRow}>
            <Text style={styles.deadlineLabel}>{item.deadline}</Text>
          </View>
        </View>

        <View style={styles.todoRightSection}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.status) }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {t(item.status)}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setSelectedTodoId(item.id);
                setReplyModalVisible(true);
              }}
            >
              <FontAwesomeIcon icon={faPaperPlane} size={15} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setSelectedTodoId(item.id);
                setEditModalVisible(true);
                setDeadline(item.deadline);
                setStatus(item.status);
              }}
            >
              <FontAwesomeIcon icon={faEdit} size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        onNotifPress={() => navigation.navigate('Notification')}
        onUpdatePress={() => navigation.navigate("PreHome", { screen: "PaymentLeave" })}
      />

      <LinearGradient colors={[SCREEN_BG, SCREEN_BG]} style={styles.gradient}>
        <View style={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.pageTitle}>{t('Todo List')}</Text>
            <Text style={styles.pageSubTitle}>{t('Track assigned tasks, replies, deadlines and status updates.')}</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate("CreateTodo")}
            >
              <Text style={styles.createButtonText}>{t('Create New Task')}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={ACCENT} style={styles.loader} />
          ) : todos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.noTodoText}>{t('No tasks assigned')}</Text>
              <Text style={styles.noTodoSubText}>{t('All your tasks are complete!')}</Text>
            </View>
          ) : (
            <FlatList
              data={todos}
              renderItem={renderTodo}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </LinearGradient>

      <Modal
        visible={replyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Send Reply')}</Text>
              <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                <FontAwesomeIcon icon={faTimes} size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.textArea}
              placeholder={t('Write your reply here...')}
              placeholderTextColor="#FFFFFF"
              multiline
              numberOfLines={3}
              value={replyText}
              onChangeText={setReplyText}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={async () => {
                try {
                  if (!selectedTodoId) return;
                  const token = userData.token || await AsyncStorage.getItem("auth_token");
                  if (!token) {
                    Alert.alert("Error", "User not authenticated");
                    return;
                  }
                  if (!replyText.trim()) {
                    Alert.alert("Error", "Please enter a reply");
                    return;
                  }
                  await replyPhpTodo({
                    token,
                    todoId: selectedTodoId,
                    reply: replyText.trim(),
                  });
                  Alert.alert("Success", "Reply sent successfully");
                  setReplyModalVisible(false);
                  setReplyText("");
                  fetchTodos();
                } catch (error) {
                  console.log("Reply todo error:", error);
                  Alert.alert("Error", "Failed to send reply");
                }
              }}
            >
              <Text style={styles.saveButtonText}>{t('Send Reply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('Update Task')}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <FontAwesomeIcon icon={faTimes} size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.updateFieldContainer}>
              <Text style={styles.modalLabel}>{t('Status')}</Text>
              <View style={styles.simplePickerContainer}>
                <Picker
                  selectedValue={status}
                  onValueChange={(val) => setStatus(val)}
                  style={styles.simplePicker}
                  dropdownIconColor={ACCENT}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label={t('Pending')} value="Pending" />
                  <Picker.Item label={t('Completed')} value="Completed" />
                  <Picker.Item label={t('Overdue')} value="Overdue" />
                </Picker>
              </View>
            </View>

            <View style={styles.updateFieldContainer}>
              <Text style={styles.modalLabel}>{t('Deadline')}</Text>
              <TextInput
                style={styles.simpleInput}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#FFFFFF"
                value={deadline}
                onChangeText={setDeadline}
                textAlign="left"
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={async () => {
                try {
                  if (!selectedTodoId) return;
                  const token = userData.token || await AsyncStorage.getItem("auth_token");
                  if (!token) {
                    Alert.alert("Error", "User not authenticated");
                    return;
                  }
                  await updatePhpTodoStatus({
                    token,
                    todoId: selectedTodoId,
                    status,
                  });
                  await syncCachedTodoStatus(token, selectedTodoId, status);
                  setTodos((currentTodos) =>
                    currentTodos.map((item) =>
                      item.id === selectedTodoId
                        ? {...item, status}
                        : item,
                    ),
                  );
                  Alert.alert('Success', 'Status updated successfully');
                  setEditModalVisible(false);
                  fetchTodos();
                } catch (error) {
                  console.log("Update todo error:", error);
                  Alert.alert("Error", "Failed to update status");
                }
              }}
            >
              <Text style={styles.saveButtonText}>{t('Update Task')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TodoScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  heroCard: {
    width: CARD_WIDTH,
    backgroundColor: SURFACE_YELLOW,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageTitle: {
    color: TEXT_DARK,
    fontSize: 16,
    fontWeight: '800',
  },
  pageSubTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
    marginTop: 2,
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    paddingBottom: 110,
    paddingTop: 2,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  noTodoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: TEXT_DARK,
    textAlign: 'center',
  },
  noTodoSubText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
  },
  todoCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    marginBottom: 5,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: colors.border,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  todoRow: {
    flexDirection: 'row',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  todoLeftSection: {
    flex: 3,
    gap: 1,
  },
  todoRightSection: {
    width: 92,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 3,
  },
  assignedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  todoAssigned: {
    color: TEXT_DARK,
    fontWeight: '800',
    fontSize: 13,
  },
  todoDate: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
    minHeight: 22,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  todoDescription: {
    color: TEXT_DARK,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#55e6ee',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  createButton: {
    width: 132,
    backgroundColor: ACCENT,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#132746',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  createButtonText: {
    color: TEXT_DARK,
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#132746',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.panel,
    padding: 20,
    width: CARD_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editModalContent: {
    backgroundColor: colors.panel,
    padding: 20,
    width: CARD_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modalTitle: {
    color: TEXT_DARK,
    fontSize: 18,
    fontWeight: 'bold',
  },
  updateFieldContainer: {
    marginBottom: 16,
  },
  modalLabel: {
    color: TEXT_DARK,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  simpleInput: {
    backgroundColor: INPUT_BG,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_DARK,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    height: 44,
    textAlign: 'left',
  },
  simplePickerContainer: {
    backgroundColor: INPUT_BG,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simplePicker: {
    height: 44,
    width: '100%',
    color: TEXT_DARK,
    fontSize: 14,
    textAlign: 'center',
  },
  pickerItem: {
    fontSize: 14,
    textAlign: 'center',
  },
  textArea: {
    backgroundColor: INPUT_BG,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_DARK,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  saveButton: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: TEXT_DARK,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
